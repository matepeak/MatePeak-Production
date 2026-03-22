import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const razorpayxKeyId = Deno.env.get("RAZORPAYX_KEY_ID") ?? "";
const razorpayxKeySecret = Deno.env.get("RAZORPAYX_KEY_SECRET") ?? "";
const razorpayxAccountNumber = Deno.env.get("RAZORPAYX_ACCOUNT_NUMBER") ?? "";
const MIN_WITHDRAWAL_AMOUNT = 500;
const TEST_WITHDRAWAL_MINIMUM_AMOUNT = 1;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const businessError = (error: string, extras: Record<string, unknown> = {}) =>
  json(200, { success: false, error, ...extras });

const toPaise = (amount: number) => Math.round(Number(amount) * 100);

const isMissingFunctionError = (message: string) =>
  /request_mentor_withdrawal|function .* does not exist|PGRST202|42883/i.test(message);

const createRazorpayxEntity = async (path: string, payload: Record<string, unknown>) => {
  const auth = btoa(`${razorpayxKeyId}:${razorpayxKeySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.error?.description || (data as any)?.message || "RazorpayX API error";
    throw new Error(`${path} failed (${res.status}): ${msg}`);
  }

  return data as any;
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

    // Authenticate user with anon-key client + incoming bearer token.
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
        const { error: createWalletError } = await serviceClient
          .from("mentor_wallets")
          .insert({
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
    let payout: any = null;

    // Preferred path: atomic RPC + payout tables.
    const { data: withdrawalData, error: withdrawalError } = await userClient.rpc(
      "request_mentor_withdrawal",
      {
        p_amount: requestedAmount,
        p_note: note || null,
      },
    );

    if (!withdrawalError && withdrawalData?.success) {
      payoutId = String(withdrawalData.payout_id || "");
      withdrawalId = String(withdrawalData.withdrawal_id || "");

      const { data: payoutData, error: payoutError } = await serviceClient
        .from("mentor_payouts")
        .select("id, mentor_id, payout_profile_id, amount, currency, payout_mode, status")
        .eq("id", payoutId)
        .maybeSingle();

      if (payoutError || !payoutData) {
        return businessError("Withdrawal reserved but payout record was not found", {
          withdrawal_id: withdrawalId,
        });
      }

      payout = payoutData;
    } else {
      const rpcErrorMessage = String(withdrawalError?.message || withdrawalData?.message || "");
      if (!isMissingFunctionError(rpcErrorMessage)) {
        return businessError(rpcErrorMessage || "Failed to request withdrawal");
      }

      // Legacy-safe fallback for projects that skipped advanced payout migration.
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
      payout = {
        id: `legacy-${withdrawalId}`,
        mentor_id: userData.user.id,
        payout_profile_id: null,
        amount: requestedAmount,
        currency: "INR",
        payout_mode: "IMPS",
      };
      payoutId = payout.id;
    }

    let payoutProfile: any = null;
    let payoutProfileSource: "safe" | "legacy" = "safe";

    if (payout?.payout_profile_id) {
      const { data: newProfile } = await serviceClient
        .from("mentor_payment_profiles")
        .select("*")
        .eq("id", payout.payout_profile_id)
        .maybeSingle();
      payoutProfile = newProfile || null;
      if (newProfile) payoutProfileSource = "safe";
    }

    if (!payoutProfile) {
      const { data: newProfileByMentor } = await serviceClient
        .from("mentor_payment_profiles")
        .select("*")
        .eq("mentor_id", payout.mentor_id)
        .maybeSingle();
      payoutProfile = newProfileByMentor || null;
      if (newProfileByMentor) payoutProfileSource = "safe";
    }

    if (!payoutProfile && payout?.payout_profile_id) {
      const { data: oldProfile } = await serviceClient
        .from("mentor_payout_profiles")
        .select("*")
        .eq("id", payout.payout_profile_id)
        .maybeSingle();
      payoutProfile = oldProfile || null;
      if (oldProfile) payoutProfileSource = "legacy";
    }

    if (!payoutProfile) {
      const { data: oldProfileByMentor } = await serviceClient
        .from("mentor_payout_profiles")
        .select("*")
        .eq("mentor_id", payout.mentor_id)
        .maybeSingle();
      payoutProfile = oldProfileByMentor || null;
      if (oldProfileByMentor) payoutProfileSource = "legacy";
    }

    const hasRazorpayxConfig = !!(razorpayxKeyId && razorpayxKeySecret && razorpayxAccountNumber);
    if (!hasRazorpayxConfig || !payoutProfile) {
      return json(200, {
        success: true,
        message: "Withdrawal queued for processing",
        withdrawal_id: withdrawalId,
        payout_id: payoutId,
        provider_mode: "manual_or_admin",
        flow: flowMode,
      });
    }

    try {
      let contactId = (payoutProfile as any)?.razorpay_contact_id as string | null;
      if (!contactId) {
        const contact = await createRazorpayxEntity("contacts", {
          name: payoutProfile.legal_name || payoutProfile.account_holder_name || "Mentor",
          email: payoutProfile.email || userData.user.email,
          contact: payoutProfile.phone || "9999999999",
          type: "vendor",
          reference_id: payout.mentor_id,
          notes: { mentor_id: payout.mentor_id },
        });
        contactId = contact.id;
      }

      let fundAccountId = (payoutProfile as any)?.razorpay_fund_account_id as string | null;
      if (!fundAccountId) {
        if (payoutProfile.payout_method === "upi") {
          const fund = await createRazorpayxEntity("fund_accounts", {
            contact_id: contactId,
            account_type: "vpa",
            vpa: {
              address: payoutProfile.upi_id,
            },
          });
          fundAccountId = fund.id;
        } else {
          const fund = await createRazorpayxEntity("fund_accounts", {
            contact_id: contactId,
            account_type: "bank_account",
            bank_account: {
              name: payoutProfile.account_holder_name,
              ifsc: payoutProfile.ifsc_code,
              account_number: payoutProfile.account_number,
            },
          });
          fundAccountId = fund.id;
        }
      }

      if (payoutProfileSource === "safe") {
        await serviceClient
          .from("mentor_payment_profiles")
          .update({
            kyc_status: "verified",
            is_kyc_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payoutProfile.id);
      } else {
        await serviceClient
          .from("mentor_payout_profiles")
          .update({
            razorpay_contact_id: contactId,
            razorpay_fund_account_id: fundAccountId,
            kyc_status: "verified",
            is_kyc_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payoutProfile.id);
      }

      const payoutResult = await createRazorpayxEntity("payouts", {
        account_number: razorpayxAccountNumber,
        fund_account_id: fundAccountId,
        amount: toPaise(payout.amount),
        currency: payout.currency || "INR",
        mode: payout.payout_mode || "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: payout.id,
        narration: "Mentor withdrawal payout",
      });

      const providerStatus = String(payoutResult.status || "").toLowerCase();
      if (flowMode === "atomic") {
        if (["processed", "completed", "success"].includes(providerStatus)) {
          await serviceClient.rpc("mark_mentor_payout_success", {
            p_payout_id: payout.id,
            p_provider_payout_id: payoutResult.id,
            p_provider_response: payoutResult,
          });
        } else if (["rejected", "failed", "cancelled", "canceled"].includes(providerStatus)) {
          await serviceClient.rpc("mark_mentor_payout_failed", {
            p_payout_id: payout.id,
            p_failure_reason: payoutResult.status_details?.description || "Razorpay payout failed",
            p_provider_response: payoutResult,
          });
        } else {
          await serviceClient
            .from("mentor_payouts")
            .update({
              status: "processing",
              provider_payout_id: payoutResult.id,
              provider_response: payoutResult,
              updated_at: new Date().toISOString(),
            })
            .eq("id", payout.id);
        }
      } else {
        if (["processed", "completed", "success"].includes(providerStatus)) {
          const walletSnapshot = await serviceClient
            .from("mentor_wallets")
            .select("total_withdrawn")
            .eq("mentor_id", payout.mentor_id)
            .single();

          await serviceClient
            .from("mentor_wallets")
            .update({
              total_withdrawn: Number(walletSnapshot.data?.total_withdrawn || 0) + Number(payout.amount || 0),
              updated_at: new Date().toISOString(),
            })
            .eq("mentor_id", payout.mentor_id);

          await serviceClient
            .from("withdrawal_requests")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              reviewed_at: new Date().toISOString(),
              transaction_id: payoutResult.id,
            })
            .eq("id", withdrawalId);
        } else if (["rejected", "failed", "cancelled", "canceled"].includes(providerStatus)) {
          const walletSnapshot = await serviceClient
            .from("mentor_wallets")
            .select("balance")
            .eq("mentor_id", payout.mentor_id)
            .single();

          await serviceClient
            .from("mentor_wallets")
            .update({
              balance: Number(walletSnapshot.data?.balance || 0) + Number(payout.amount || 0),
              updated_at: new Date().toISOString(),
            })
            .eq("mentor_id", payout.mentor_id);

          await serviceClient
            .from("withdrawal_requests")
            .update({
              status: "rejected",
              rejection_reason: payoutResult.status_details?.description || "Razorpay payout failed",
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", withdrawalId);
        }
      }

      return json(200, {
        success: true,
        message: "Withdrawal request submitted",
        withdrawal_id: withdrawalId,
        payout_id: payout.id,
        provider_payout_id: payoutResult.id,
        provider_status: payoutResult.status,
        flow: flowMode,
      });
    } catch (providerError) {
      const reason = providerError instanceof Error ? providerError.message : "Provider payout failed";

      if (flowMode === "atomic") {
        await serviceClient.rpc("mark_mentor_payout_failed", {
          p_payout_id: payout.id,
          p_failure_reason: reason,
          p_provider_response: { error: reason },
        });
      } else {
        const walletSnapshot = await serviceClient
          .from("mentor_wallets")
          .select("balance")
          .eq("mentor_id", payout.mentor_id)
          .single();

        await serviceClient
          .from("mentor_wallets")
          .update({
            balance: Number(walletSnapshot.data?.balance || 0) + Number(payout.amount || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("mentor_id", payout.mentor_id);

        await serviceClient
          .from("withdrawal_requests")
          .update({
            status: "rejected",
            rejection_reason: reason,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", withdrawalId);
      }

      return businessError(reason, {
        withdrawal_id: withdrawalId,
        payout_id: payout.id,
        flow: flowMode,
      });
    }
  } catch (error) {
    console.error("wallet-withdraw error:", error);
    return businessError(error instanceof Error ? error.message : "Unknown error");
  }
});
