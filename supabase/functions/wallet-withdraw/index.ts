import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const paymentsNotificationEmail = Deno.env.get("WITHDRAWAL_ALERT_EMAIL") || "payments@matepeak.com";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFrom = Deno.env.get("RESEND_FROM") || "MatePeak <support@matepeak.com>";
const MIN_WITHDRAWAL_AMOUNT = 500;
const TEST_WITHDRAWAL_MINIMUM_AMOUNT = 500;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const businessError = (error: string, extras: Record<string, unknown> = {}) =>
  json(200, { success: false, error, ...extras });

const isMissingFunctionError = (message: string) =>
  /request_mentor_withdrawal|function .* does not exist|PGRST202|42883|test_mode_forced_legacy/i.test(message);

const shouldFallbackToLegacy = (message: string) =>
  /minimum withdrawal amount|payout setup is incomplete|kyc is required|configure payments|must be greater than zero|test_mode_forced_legacy/i.test(
    String(message || "").toLowerCase(),
  );

const mapPayoutAccountToProfile = (account: any) => {
  if (!account) return null;

  return {
    id: account.id,
    mentor_id: account.mentor_id,
    payout_method: account.payout_method === "upi" ? "upi" : "bank_account",
    account_type: "savings",
    account_holder_name: account.account_holder_name || null,
    account_number: account.account_number || null,
    ifsc_code: account.ifsc_code || null,
    upi_id: account.upi_id || null,
    legal_name: account.account_holder_name || null,
    phone: null,
    email: null,
    currency: "INR",
    country_code: "IN",
    razorpay_contact_id: null,
    razorpay_fund_account_id: null,
    kyc_status: account.verification_status === "verified" ? "verified" : "submitted",
    is_kyc_verified: account.verification_status === "verified",
  };
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatAmountINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const sendPaymentsWithdrawalAlert = async (
  serviceClient: any,
  mentorId: string,
  mentorEmail: string | null,
  amount: number,
  withdrawalId: string,
  flowMode: "atomic" | "legacy"
) => {
  if (!paymentsNotificationEmail) {
    return;
  }

  try {
    let mentorUsername: string | null = null;
    let mentorName: string | null = null;

    const { data: profileRow } = await serviceClient
      .from("profiles")
      .select("full_name,email")
      .eq("id", mentorId)
      .maybeSingle();

    mentorName = profileRow?.full_name || null;
    const resolvedMentorEmail = mentorEmail || profileRow?.email || null;

    const { data: expertById } = await serviceClient
      .from("expert_profiles")
      .select("username")
      .eq("id", mentorId)
      .maybeSingle();
    mentorUsername = expertById?.username || null;

    const requestedAt = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium",
      hour12: true,
    });

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 700px; margin: 0 auto; color: #111827; line-height: 1.6;">
        <h2 style="margin: 0 0 12px;">New Withdrawal Request Submitted</h2>
        <p style="margin: 0 0 16px;">A mentor has submitted a withdrawal request that requires admin review.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 16px;">
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Withdrawal ID</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(withdrawalId)}</td></tr>
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Amount</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(formatAmountINR(amount))}</td></tr>
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Requested At</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(requestedAt)}</td></tr>
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Mentor Username</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(mentorUsername || "-")}</td></tr>
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Mentor Name</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(mentorName || "-")}</td></tr>
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Mentor Email</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(resolvedMentorEmail || "-")}</td></tr>
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Mentor ID</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(mentorId)}</td></tr>
          <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Flow</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${escapeHtml(flowMode)}</td></tr>
        </table>
      </div>
    `;

    const subject = `New Withdrawal Request - ${formatAmountINR(amount)} - ${mentorUsername || mentorId}`;

    const { data: emailData, error: emailError } = await serviceClient.functions.invoke("send-email", {
      body: {
        to: paymentsNotificationEmail,
        subject,
        html,
      },
    });

    if (!emailError && emailData?.success) {
      console.log("Withdrawal alert email sent to payments mailbox", {
        to: paymentsNotificationEmail,
        withdrawalId,
        mentorId,
        amount,
        emailId: emailData?.id || null,
        provider: "send-email-function",
      });
      return;
    }

    console.error("send-email function failed, trying direct Resend fallback", {
      error: emailError,
      data: emailData,
      to: paymentsNotificationEmail,
      withdrawalId,
    });

    if (!resendApiKey) {
      console.error("RESEND_API_KEY missing; cannot perform fallback email send");
      return;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFrom,
        to: paymentsNotificationEmail,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const resendBody = await resendResponse.text();
      console.error("Direct Resend fallback failed", {
        status: resendResponse.status,
        body: resendBody,
      });
      return;
    }

    const resendData = await resendResponse.json();
    console.log("Withdrawal alert email sent via direct Resend fallback", {
      to: paymentsNotificationEmail,
      withdrawalId,
      mentorId,
      amount,
      emailId: resendData?.id || null,
      provider: "direct-resend",
    });
  } catch (error) {
    console.error("Error sending withdrawal alert to payments:", error);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return json(401, { success: false, error: "Missing Authorization header" });
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return json(500, { success: false, error: "Missing Supabase environment variables" });
    }

    const body = await req.json();
    const action = String(body?.action || "").trim().toLowerCase();
    const testMode = Boolean(body?.test_mode);
    const requestedAmount = Number(body?.amount);
    const note = body?.note ?? null;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json(401, { success: false, error: "Unauthorized" });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "test_credit") {
      const creditAmount = requestedAmount > 0 ? requestedAmount : 1;

      if (creditAmount !== 1) {
        return businessError("Only INR 1 test credit is allowed");
      }

      const { data: wallet, error: walletError } = await serviceClient
        .from("mentor_wallets")
        .select("mentor_id, balance, total_earned")
        .eq("mentor_id", userData.user.id)
        .maybeSingle();

      if (walletError) {
        return businessError(walletError.message || "Failed to read mentor wallet");
      }

      let newBalance = 1;
      if (!wallet) {
        const { error: createWalletError } = await serviceClient.from("mentor_wallets").insert({
          mentor_id: userData.user.id,
          balance: 1,
          total_earned: 1,
          total_withdrawn: 0,
          updated_at: new Date().toISOString(),
        });

        if (createWalletError) {
          return businessError(createWalletError.message || "Failed to initialize mentor wallet");
        }
      } else {
        newBalance = Number(wallet.balance || 0) + 1;
        const { error: updateWalletError } = await serviceClient
          .from("mentor_wallets")
          .update({
            balance: newBalance,
            total_earned: Number(wallet.total_earned || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("mentor_id", userData.user.id);

        if (updateWalletError) {
          return businessError(updateWalletError.message || "Failed to add test wallet credit");
        }
      }

      return json(200, {
        success: true,
        message: "INR 1 test credit added",
        credit_amount: 1,
        new_balance: newBalance,
      });
    }

    if (!requestedAmount || requestedAmount <= 0) {
      return businessError("Invalid withdrawal amount");
    }

    const minimumAmount = testMode ? TEST_WITHDRAWAL_MINIMUM_AMOUNT : MIN_WITHDRAWAL_AMOUNT;
    if (requestedAmount < minimumAmount) {
      return businessError(`Minimum withdrawal amount is ${minimumAmount}`);
    }

    let flowMode: "atomic" | "legacy" = "atomic";
    let withdrawalId = "";
    let payoutId = "";

    let withdrawalData: any = null;
    let withdrawalError: any = null;

    if (!testMode) {
      const rpcResult = await userClient.rpc("request_mentor_withdrawal", {
        p_amount: requestedAmount,
        p_note: note || null,
      });
      withdrawalData = rpcResult.data;
      withdrawalError = rpcResult.error;
    } else {
      withdrawalError = { message: "test_mode_forced_legacy" };
    }

    if (!withdrawalError && withdrawalData?.success) {
      payoutId = String(withdrawalData.payout_id || "");
      withdrawalId = String(withdrawalData.withdrawal_id || "");

      const { data: payoutData, error: payoutError } = await serviceClient
        .from("mentor_payouts")
        .select("id")
        .eq("id", payoutId)
        .maybeSingle();

      if (payoutError || !payoutData) {
        return businessError("Withdrawal reserved but payout record was not found", {
          withdrawal_id: withdrawalId,
        });
      }
    } else {
      const rpcErrorMessage = String(withdrawalError?.message || withdrawalData?.message || "");
      if (!isMissingFunctionError(rpcErrorMessage) && !shouldFallbackToLegacy(rpcErrorMessage)) {
        return businessError(rpcErrorMessage || "Failed to request withdrawal");
      }

      flowMode = "legacy";

      const { data: wallet, error: walletError } = await serviceClient
        .from("mentor_wallets")
        .select("mentor_id, balance")
        .eq("mentor_id", userData.user.id)
        .maybeSingle();

      if (walletError) {
        return businessError(walletError.message || "Failed to read mentor wallet");
      }

      let walletRecord = wallet;
      if (!walletRecord) {
        const { data: createdWallet, error: createWalletError } = await serviceClient
          .from("mentor_wallets")
          .insert({ mentor_id: userData.user.id, balance: 0, total_earned: 0, total_withdrawn: 0 })
          .select("mentor_id, balance")
          .single();

        if (createWalletError) {
          return businessError(createWalletError.message || "Failed to initialize mentor wallet");
        }

        walletRecord = createdWallet;
      }

      if (Number(walletRecord.balance || 0) < requestedAmount) {
        return businessError("Insufficient wallet balance", {
          current_balance: Number(walletRecord.balance || 0),
        });
      }

      const { error: deductError } = await serviceClient
        .from("mentor_wallets")
        .update({
          balance: Number(walletRecord.balance || 0) - requestedAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("mentor_id", userData.user.id);

      if (deductError) {
        return businessError(deductError.message || "Failed to reserve wallet balance");
      }

      let payoutProfile: any = null;
      const { data: safeProfile } = await serviceClient
        .from("mentor_payment_profiles")
        .select("*")
        .eq("mentor_id", userData.user.id)
        .maybeSingle();
      payoutProfile = safeProfile || null;

      if (!payoutProfile) {
        const { data: oldProfile } = await serviceClient
          .from("mentor_payout_profiles")
          .select("*")
          .eq("mentor_id", userData.user.id)
          .maybeSingle();
        payoutProfile = oldProfile || null;
      }

      if (!payoutProfile) {
        const { data: payoutAccount } = await serviceClient
          .from("mentor_payout_accounts")
          .select("*")
          .eq("mentor_id", userData.user.id)
          .eq("is_active", true)
          .maybeSingle();

        payoutProfile = mapPayoutAccountToProfile(payoutAccount);
      }

      const { data: withdrawalRow, error: withdrawalInsertError } = await serviceClient
        .from("withdrawal_requests")
        .insert({
          mentor_id: userData.user.id,
          amount: requestedAmount,
          status: "pending",
          account_details: {
            payout_method: payoutProfile?.payout_method || "bank_account",
            account_type: payoutProfile?.account_type || "savings",
            account_holder_name: payoutProfile?.account_holder_name || null,
            account_number: payoutProfile?.account_number || null,
            account_number_masked: payoutProfile?.account_number
              ? `${"*".repeat(Math.max(String(payoutProfile.account_number).length - 4, 0))}${String(
                  payoutProfile.account_number,
                ).slice(-4)}`
              : null,
            ifsc_code: payoutProfile?.ifsc_code || null,
            upi_id: payoutProfile?.upi_id || null,
            currency: payoutProfile?.currency || "INR",
            country_code: payoutProfile?.country_code || "IN",
          },
          notes: note || "",
        })
        .select("id")
        .single();

      if (withdrawalInsertError || !withdrawalRow) {
        await serviceClient
          .from("mentor_wallets")
          .update({
            balance: Number(walletRecord.balance || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("mentor_id", userData.user.id);

        return businessError(withdrawalInsertError?.message || "Failed to create withdrawal request");
      }

      withdrawalId = String(withdrawalRow.id);
      payoutId = `legacy-${withdrawalId}`;
    }

    await sendPaymentsWithdrawalAlert(
      serviceClient,
      userData.user.id,
      userData.user.email || null,
      requestedAmount,
      withdrawalId,
      flowMode,
    );

    return json(200, {
      success: true,
      message: "Withdrawal request submitted for admin review",
      withdrawal_id: withdrawalId,
      payout_id: payoutId,
      provider_mode: "manual_admin_review",
      queue_reason: "manual_payout_enabled",
      test_mode: testMode,
      flow: flowMode,
      status: flowMode === "atomic" ? "processing" : "pending",
    });
  } catch (error) {
    console.error("wallet-withdraw error:", error);
    return businessError(error instanceof Error ? error.message : "Unknown error");
  }
});
