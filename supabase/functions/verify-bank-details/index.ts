// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PayoutMethod = "bank" | "upi";

interface VerificationRequest {
  payoutMethod: PayoutMethod;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  upiId?: string | null;
}

type VerificationState = "verified" | "pending" | "failed";

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sanitizeMessage = (message: string): string => {
  if (!message) return "Verification failed";
  return message.slice(0, 300);
};

const normalizeVerificationStatus = (providerData: any): VerificationState => {
  const status = String(providerData?.status || "").toLowerCase();
  const resultStatus = String(
    providerData?.results?.[0]?.status || providerData?.result?.status || ""
  ).toLowerCase();

  if (["completed", "active", "success", "validated", "verified"].includes(status)) {
    return "verified";
  }

  if (["completed", "active", "success", "validated", "verified"].includes(resultStatus)) {
    return "verified";
  }

  if (["processing", "pending", "created", "queued", "in_progress"].includes(status)) {
    return "pending";
  }

  return "failed";
};

const validateInput = (body: VerificationRequest): string | null => {
  if (!body?.payoutMethod) return "Payout method is required";

  if (body.payoutMethod === "bank") {
    if (!body.accountHolderName?.trim()) return "Account holder name is required";
    if (!body.accountNumber?.trim()) return "Account number is required";
    if (!body.ifscCode?.trim()) return "IFSC code is required";
    if (!body.bankName?.trim()) return "Bank name is required";
    return null;
  }

  if (body.payoutMethod === "upi") {
    if (!body.upiId?.trim()) return "UPI ID is required";
    const upiPattern = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiPattern.test(body.upiId.trim())) return "Invalid UPI ID format";
    return null;
  }

  return "Unsupported payout method";
};

const buildContact = (userId: string, email?: string | null, name?: string | null) => ({
  name: name?.trim() || "Mentor",
  email: (email?.trim() || `mentor+${userId}@example.com`).toLowerCase(),
  contact: "9000000000",
  type: "vendor",
  reference_id: userId,
  notes: {
    mentor_id: userId,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(401, {
        success: false,
        verified: false,
        message: "Unauthorized",
      });
    }

    const body = (await req.json()) as VerificationRequest;
    const validationError = validateInput(body);

    if (validationError) {
      return jsonResponse(400, {
        success: false,
        verified: false,
        message: validationError,
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

    if (!keyId || !keySecret) {
      return jsonResponse(500, {
        success: false,
        verified: false,
        message: "Razorpay credentials are not configured",
      });
    }

    const auth = btoa(`${keyId}:${keySecret}`);
    const sourceAccountNumber = Deno.env.get("RAZORPAYX_SOURCE_ACCOUNT_NUMBER") || "";

    if (!sourceAccountNumber) {
      return jsonResponse(500, {
        success: false,
        verified: false,
        verification_status: "failed",
        message:
          "Missing RAZORPAYX_SOURCE_ACCOUNT_NUMBER secret. Configure your RazorpayX source account number in Supabase Edge Function secrets.",
      });
    }

    const verificationPayload =
      body.payoutMethod === "bank"
        ? {
            account_number: sourceAccountNumber,
            fund_account: {
              account_type: "bank_account",
              bank_account: {
                name: body.accountHolderName?.trim(),
                ifsc: body.ifscCode?.trim().toUpperCase(),
                account_number: body.accountNumber?.trim(),
              },
              contact: buildContact(user.id, user.email, body.accountHolderName),
            },
          }
        : {
            account_number: sourceAccountNumber,
            fund_account: {
              account_type: "vpa",
              vpa: {
                address: body.upiId?.trim().toLowerCase(),
              },
              contact: buildContact(user.id, user.email, body.accountHolderName),
            },
          };

    const response = await fetch("https://api.razorpay.com/v1/fund_accounts/validations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(verificationPayload),
    });

    const providerData = await response.json();

    if (!response.ok) {
      return jsonResponse(200, {
        success: true,
        verified: false,
        verification_status: "failed",
        reference_id: providerData?.id || null,
        message: sanitizeMessage(
          providerData?.error?.description ||
            providerData?.error?.reason ||
            "Verification failed with provider"
        ),
      });
    }

    const providerStatus = String(providerData?.status || "").toLowerCase();
    const verificationStatus = normalizeVerificationStatus(providerData);
    const verified = verificationStatus === "verified";

    return jsonResponse(200, {
      success: true,
      verified,
      verification_status: verificationStatus,
      reference_id: providerData?.id || null,
      message:
        verificationStatus === "verified"
          ? "Bank details verified successfully"
          : verificationStatus === "pending"
            ? "Verification is in progress. Please retry shortly."
            : sanitizeMessage(
                providerData?.error_description ||
                  providerData?.message ||
                  "Verification could not be completed"
              ),
      provider_status: providerStatus || null,
    });
  } catch (error: any) {
    console.error("verify-bank-details error:", error);
    return jsonResponse(500, {
      success: false,
      verified: false,
      message: sanitizeMessage(error?.message || "Internal server error"),
    });
  }
});
