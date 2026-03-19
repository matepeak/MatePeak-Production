import { supabase } from "@/integrations/supabase/client";

export const MIN_WITHDRAWAL_AMOUNT = 500;

export type PayoutMethod = "bank" | "upi";
export type VerificationStatus = "unverified" | "pending" | "verified" | "failed";

export interface MentorWallet {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

export interface MentorPayoutAccount {
  id: string;
  mentor_id: string;
  payout_method: PayoutMethod;
  account_holder_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  bank_name: string | null;
  upi_id: string | null;
  verification_status: VerificationStatus;
  verification_reference: string | null;
  verification_message: string | null;
  verified_at: string | null;
  last_verified_at: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  transaction_id: string | null;
}

export interface EarningsSnapshot {
  wallet: MentorWallet;
  payoutAccount: MentorPayoutAccount | null;
  withdrawals: WithdrawalRequest[];
}

export interface SavePayoutAccountInput {
  mentorId: string;
  payoutMethod: PayoutMethod;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  upiId?: string;
}

const normalizeVerificationStatus = (status: unknown): VerificationStatus => {
  if (status === "verified") return "verified";
  if (status === "pending") return "pending";
  if (status === "failed") return "failed";
  return "failed";
};

const parseAmount = (value: unknown): number => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function getMentorEarningsSnapshot(
  mentorId: string
): Promise<{ success: boolean; data?: EarningsSnapshot; error?: string }> {
  try {
    const [walletRes, payoutRes, withdrawalsRes] = await Promise.all([
      supabase
        .from("mentor_wallets")
        .select("balance,total_earned,total_withdrawn")
        .eq("mentor_id", mentorId)
        .maybeSingle(),
      supabase
        .from("mentor_payout_accounts")
        .select("*")
        .eq("mentor_id", mentorId)
        .maybeSingle(),
      supabase
        .from("withdrawal_requests")
        .select(
          "id,amount,status,requested_at,reviewed_at,rejection_reason,transaction_id"
        )
        .eq("mentor_id", mentorId)
        .order("requested_at", { ascending: false })
        .limit(20),
    ]);

    if (walletRes.error) throw walletRes.error;
    if (payoutRes.error) throw payoutRes.error;
    if (withdrawalsRes.error) throw withdrawalsRes.error;

    const approvedOrCompletedTotal = (withdrawalsRes.data || [])
      .filter((row) => row.status === "approved" || row.status === "completed")
      .reduce((sum, row) => sum + parseAmount(row.amount), 0);

    const wallet: MentorWallet = {
      balance: parseAmount(walletRes.data?.balance),
      total_earned: parseAmount(walletRes.data?.total_earned),
      total_withdrawn:
        parseAmount(walletRes.data?.total_withdrawn) || approvedOrCompletedTotal,
    };

    return {
      success: true,
      data: {
        wallet,
        payoutAccount: (payoutRes.data as MentorPayoutAccount | null) ?? null,
        withdrawals:
          ((withdrawalsRes.data || []).map((row) => ({
            ...row,
            amount: parseAmount(row.amount),
          })) as WithdrawalRequest[]) ?? [],
      },
    };
  } catch (error: any) {
    console.error("Error loading mentor earnings snapshot:", error);
    return {
      success: false,
      error: error?.message || "Failed to load earnings data",
    };
  }
}

export async function saveAndVerifyPayoutAccount(
  input: SavePayoutAccountInput
): Promise<{ success: boolean; verified: boolean; message: string }> {
  try {
    const normalizedMethod = input.payoutMethod;

    const payload = {
      mentor_id: input.mentorId,
      payout_method: normalizedMethod,
      account_holder_name:
        normalizedMethod === "bank" ? input.accountHolderName?.trim() || null : null,
      account_number:
        normalizedMethod === "bank"
          ? input.accountNumber?.replace(/\s+/g, "") || null
          : null,
      ifsc_code:
        normalizedMethod === "bank"
          ? input.ifscCode?.trim().toUpperCase() || null
          : null,
      bank_name: normalizedMethod === "bank" ? input.bankName?.trim() || null : null,
      upi_id:
        normalizedMethod === "upi" ? input.upiId?.trim().toLowerCase() || null : null,
      verification_status: "pending" as VerificationStatus,
      verification_message: null,
      verification_reference: null,
      verified_at: null,
      last_verified_at: new Date().toISOString(),
      is_active: true,
    };

    const { error: upsertError } = await supabase
      .from("mentor_payout_accounts")
      .upsert(payload, { onConflict: "mentor_id" });

    if (upsertError) throw upsertError;

    const { data, error } = await supabase.functions.invoke("verify-bank-details", {
      body: {
        payoutMethod: normalizedMethod,
        accountHolderName: payload.account_holder_name,
        accountNumber: payload.account_number,
        ifscCode: payload.ifsc_code,
        bankName: payload.bank_name,
        upiId: payload.upi_id,
      },
    });

    const verificationResponse = data || {};

    if (error || !verificationResponse?.success) {
      const failureMessage =
        verificationResponse?.message ||
        error?.message ||
        "Verification failed. Details are saved but remain unverified.";

      const { error: updateError } = await supabase
        .from("mentor_payout_accounts")
        .update({
          verification_status: "failed",
          verification_message: failureMessage,
          verification_reference: verificationResponse?.reference_id || null,
          verified_at: null,
          last_verified_at: new Date().toISOString(),
        })
        .eq("mentor_id", input.mentorId);

      if (updateError) throw updateError;

      return {
        success: true,
        verified: false,
        message: failureMessage,
      };
    }

    const verified = Boolean(verificationResponse?.verified);
    const finalStatus = normalizeVerificationStatus(
      verificationResponse?.verification_status ?? (verified ? "verified" : "failed")
    );

    const { error: updateError } = await supabase
      .from("mentor_payout_accounts")
      .update({
        verification_status: finalStatus,
        verification_message:
          verificationResponse?.message ||
          (finalStatus === "verified"
            ? "Payout account verified successfully"
            : finalStatus === "pending"
              ? "Verification is in progress."
              : "Verification failed. Details are saved but remain unverified."),
        verification_reference: verificationResponse?.reference_id || null,
        verified_at: finalStatus === "verified" ? new Date().toISOString() : null,
        last_verified_at: new Date().toISOString(),
      })
      .eq("mentor_id", input.mentorId);

    if (updateError) throw updateError;

    return {
      success: true,
      verified: finalStatus === "verified",
      message:
        verificationResponse?.message ||
        (finalStatus === "verified"
          ? "Payout account verified successfully"
          : finalStatus === "pending"
            ? "Verification is in progress."
            : "Verification failed. Details are saved but remain unverified."),
    };
  } catch (error: any) {
    console.error("Error saving payout account:", error);
    return {
      success: false,
      verified: false,
      message: error?.message || "Failed to save payout account details",
    };
  }
}

export async function createWithdrawalRequest(
  amount: number
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc("mentor_create_withdrawal_request", {
      p_amount: amount,
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || "Withdrawal request submitted successfully",
    };
  } catch (error: any) {
    console.error("Error creating withdrawal request:", error);
    return {
      success: false,
      message: error?.message || "Failed to create withdrawal request",
    };
  }
}

export function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return "";
  const clean = accountNumber.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `${"•".repeat(Math.max(clean.length - 4, 4))}${clean.slice(-4)}`;
}
