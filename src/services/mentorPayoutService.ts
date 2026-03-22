import { supabase } from "@/integrations/supabase/client";

export interface MentorWalletSummary {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
}

export interface MentorPayoutProfileInput {
  currency: string;
  countryCode: string;
  payoutMethod: "bank_account" | "upi";
  accountType?: "savings" | "current";
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  phone?: string;
  email?: string;
  panNumber?: string;
  aadhaarLast4?: string;
  legalName?: string;
  businessName?: string;
  isKycVerified?: boolean;
}

const toNumber = (value: unknown) => Number(value || 0);

export async function getMentorWalletSummary(): Promise<MentorWalletSummary> {
  let data: any = null;
  let error: any = null;

  // Newer schema path (has pending_withdrawal)
  const firstAttempt = await supabase
    .from("mentor_wallets")
    .select("balance, total_earned, total_withdrawn, pending_withdrawal")
    .single();

  data = firstAttempt.data;
  error = firstAttempt.error;

  // Backward schema path (without pending_withdrawal)
  if (error && /pending_withdrawal|column .* does not exist/i.test(String(error?.message || ""))) {
    const fallbackAttempt = await supabase
      .from("mentor_wallets")
      .select("balance, total_earned, total_withdrawn")
      .single();
    data = fallbackAttempt.data;
    error = fallbackAttempt.error;
  }

  if (error) {
    if (error.code === "PGRST116") {
      return {
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawal: 0,
      };
    }
    throw error;
  }

  return {
    balance: toNumber(data.balance),
    totalEarned: toNumber(data.total_earned),
    totalWithdrawn: toNumber(data.total_withdrawn),
    pendingWithdrawal: toNumber(data.pending_withdrawal),
  };
}

export async function getMentorPayoutProfile() {
  // Primary: safe additive table.
  const { data, error } = await supabase
    .from("mentor_payment_profiles")
    .select("*")
    .maybeSingle();

  if (!error || error?.code === "PGRST116") return data || null;

  // Backward fallback: old table, for environments that already use it.
  const isMissingNewTable = /mentor_payment_profiles|42P01|PGRST205|schema cache/i.test(
    String(error?.message || ""),
  );
  if (isMissingNewTable) {
    const { data: oldData, error: oldError } = await supabase
      .from("mentor_payout_profiles")
      .select("*")
      .maybeSingle();

    if (oldError && oldError.code !== "PGRST116") throw oldError;
    return oldData || null;
  }

  throw error;
}

export async function saveMentorPayoutProfile(input: MentorPayoutProfileInput) {
  const rpcPayload = {
    p_currency: input.currency,
    p_country_code: input.countryCode,
    p_payout_method: input.payoutMethod,
    p_account_type: input.accountType || null,
    p_account_holder_name: input.accountHolderName || null,
    p_account_number: input.accountNumber || null,
    p_ifsc_code: input.ifscCode || null,
    p_upi_id: input.upiId || null,
    p_phone: input.phone || null,
    p_email: input.email || null,
    p_pan_number: input.panNumber || null,
    p_aadhaar_last4: input.aadhaarLast4 || null,
    p_legal_name: input.legalName || null,
    p_business_name: input.businessName || null,
    p_is_kyc_verified: input.isKycVerified ?? false,
  };

  const { data, error } = await supabase.rpc("upsert_mentor_payment_profile", rpcPayload);

  if (!error) return data;

  const rawMessage = String((error as any)?.message || "");
  const isMissingRpc = /upsert_mentor_payment_profile|function .* does not exist|PGRST202|42883/i.test(
    rawMessage,
  );

  // Fallback: if RPC is not available but table exists, write directly.
  if (isMissingRpc) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be signed in to save payment settings.");
    }

    const directPayload = {
      mentor_id: user.id,
      currency: input.currency,
      country_code: input.countryCode,
      payout_method: input.payoutMethod,
      account_type: input.accountType || null,
      account_holder_name: input.accountHolderName || null,
      account_number: input.accountNumber || null,
      ifsc_code: input.ifscCode || null,
      upi_id: input.upiId || null,
      phone: input.phone || null,
      email: input.email || null,
      pan_number: input.panNumber || null,
      aadhaar_last4: input.aadhaarLast4 || null,
      legal_name: input.legalName || null,
      business_name: input.businessName || null,
      is_kyc_verified: input.isKycVerified ?? false,
      kyc_status: input.isKycVerified ? "verified" : "submitted",
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: upsertData, error: upsertError } = await supabase
      .from("mentor_payment_profiles")
      .upsert(directPayload, { onConflict: "mentor_id" })
      .select()
      .single();

    if (!upsertError) return upsertData;

    const upsertErrorMessage = String((upsertError as any)?.message || "");
    if (/relation .*mentor_payment_profiles.* does not exist|42P01/i.test(upsertErrorMessage)) {
      throw new Error(
        "Payment setup backend is not ready yet (migration missing). Please ask admin to run latest DB migration.",
      );
    }

    throw new Error(upsertErrorMessage || "Failed to save payment settings.");
  }

  if (/relation .*mentor_payment_profiles.* does not exist|42P01/i.test(rawMessage)) {
    throw new Error(
      "Payment setup backend is not ready yet (migration missing). Please ask admin to run latest DB migration.",
    );
  }

  throw new Error(rawMessage || "Failed to save payment settings.");
}

export async function getMentorEarnings(limit = 50) {
  const { data, error } = await supabase
    .from("mentor_earnings")
    .select("id, booking_id, gross_amount, platform_fee, net_amount, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    const message = String(error?.message || "");
    if (/mentor_earnings|relation .* does not exist|42P01|schema cache/i.test(message)) {
      return [];
    }
    throw error;
  }
  return data || [];
}

export async function getMentorPayouts(limit = 50) {
  const { data, error } = await supabase
    .from("mentor_payouts")
    .select("id, amount, currency, payout_mode, provider, status, failure_reason, created_at, processed_at, provider_payout_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    const message = String(error?.message || "");
    if (/mentor_payouts|relation .* does not exist|42P01|schema cache/i.test(message)) {
      return [];
    }
    throw error;
  }
  return data || [];
}

export async function getWithdrawalRequests(limit = 50) {
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("id, amount, status, requested_at, reviewed_at, completed_at, rejection_reason, transaction_id")
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function requestWithdrawal(amount: number, note?: string, testMode = false) {
  const { data, error } = await supabase.functions.invoke("wallet-withdraw", {
    body: {
      amount,
      note: note || null,
      test_mode: testMode,
    },
  });

  if (error) {
    const context = (error as any)?.context;
    if (context && typeof context.json === "function") {
      try {
        const payload = await context.json();
        const message = String(payload?.error || payload?.message || "").trim();
        if (message) throw new Error(message);
      } catch {
        // Ignore JSON parsing errors and fall back to generic message.
      }
    }

    throw new Error((error as any)?.message || "Withdrawal request failed");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Withdrawal request failed");
  }

  return data;
}

export async function addTestWalletCredit() {
  const { data, error } = await supabase.functions.invoke("wallet-withdraw", {
    body: {
      action: "test_credit",
      amount: 1,
    },
  });

  if (error) {
    const context = (error as any)?.context;
    if (context && typeof context.json === "function") {
      try {
        const payload = await context.json();
        const message = String(payload?.error || payload?.message || "").trim();
        if (message) throw new Error(message);
      } catch {
        // Ignore JSON parsing errors and fall back to generic message.
      }
    }

    throw new Error((error as any)?.message || "Failed to add test wallet credit");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Failed to add test wallet credit");
  }

  return data;
}
