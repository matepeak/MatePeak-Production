// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const otpDebugMode = (Deno.env.get("OTP_DEBUG_MODE") ?? "false").toLowerCase() === "true";

interface OtpRequest {
  action: "send" | "verify";
  email: string;
  otp?: string;
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generateOtp = (): string => {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return (bytes[0] % 1000000).toString().padStart(6, "0");
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
};

const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { width: 100%; background-color: #e9ebed; padding: 48px 16px; }
    .inner-container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; background: #ffffff; margin-bottom: 28px; }
    .content { color: #111827; background-color: #ffffff; }
    .content p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .otp-box { margin: 30px 0; padding: 20px; border-radius: 8px; background: #f4f5f7; text-align: center; }
    .otp-code { letter-spacing: 6px; font-size: 30px; font-weight: 700; }
    .warning { color: #b91c1c; font-weight: 600; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; background: #ffffff; }
    .link { color: #000; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container"><div class="inner-container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <h2 style="margin:0;">MatePeak Email Verification</h2>
    </div>
    <div class="content">
      <p>Your One-Time Password (OTP) is:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p class="warning">This OTP expires in 1 minute.</p>
      <p>If you did not request this code, please ignore this email.</p>
    </div>
    <div class="footer">
      <p style="margin:0;">Need help? <a href="mailto:support@matepeak.com" class="link">Contact Support</a></p>
    </div>
  </div></div>
</body>
</html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "MatePeak <support@matepeak.com>",
      to,
      subject: "Your MatePeak verification OTP",
      html,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to send OTP email (${res.status}): ${errorBody}`);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, message: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, { success: false, message: "Missing Supabase environment variables" });
  }

  try {
    const body = (await req.json()) as OtpRequest;
    const action = body?.action;
    const email = normalizeEmail(body?.email || "");

    if (!action || (action !== "send" && action !== "verify")) {
      return jsonResponse(400, {
        success: false,
        message: "Invalid action. Use 'send' or 'verify'.",
      });
    }

    if (!email || !isValidEmail(email)) {
      return jsonResponse(400, { success: false, message: "Valid email is required" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (action === "send") {
      const otp = generateOtp();
      const otpHash = await sha256Hex(otp);

      await supabase
        .from("email_otps")
        .update({ used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("email", email)
        .is("used_at", null);

      const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
      const { error: insertError } = await supabase.from("email_otps").insert({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      });

      if (insertError) {
        return jsonResponse(500, {
          success: false,
          message: "Failed to store OTP",
          error: insertError.message,
        });
      }

      await sendOtpEmail(email, otp);

      const responseBody: Record<string, unknown> = {
        success: true,
        message: "OTP sent successfully",
        expires_in_seconds: 60,
      };

      if (otpDebugMode) {
        responseBody.debug_otp = otp;
      }

      return jsonResponse(200, responseBody);
    }

    const otp = (body?.otp || "").trim();
    if (!/^\d{6}$/.test(otp)) {
      return jsonResponse(400, { success: false, message: "OTP must be exactly 6 digits" });
    }

    const otpHash = await sha256Hex(otp);

    const { data: matchingOtp, error: matchingError } = await supabase
      .from("email_otps")
      .select("id, expires_at")
      .eq("email", email)
      .eq("otp_hash", otpHash)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchingError) {
      return jsonResponse(500, {
        success: false,
        message: "Failed to verify OTP",
        error: matchingError.message,
      });
    }

    if (!matchingOtp) {
      const { data: latestOtp } = await supabase
        .from("email_otps")
        .select("id, expires_at, verify_attempts")
        .eq("email", email)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOtp?.id) {
        await supabase
          .from("email_otps")
          .update({
            verify_attempts: (latestOtp.verify_attempts || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", latestOtp.id);

        if (new Date(latestOtp.expires_at).getTime() < Date.now()) {
          return jsonResponse(400, { success: false, message: "OTP expired" });
        }
      }

      return jsonResponse(400, { success: false, message: "Invalid OTP" });
    }

    if (new Date(matchingOtp.expires_at).getTime() < Date.now()) {
      await supabase
        .from("email_otps")
        .update({ used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", matchingOtp.id);

      return jsonResponse(400, { success: false, message: "OTP expired" });
    }

    const nowIso = new Date().toISOString();
    const { error: consumeError } = await supabase
      .from("email_otps")
      .update({
        used_at: nowIso,
        verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", matchingOtp.id)
      .is("used_at", null);

    if (consumeError) {
      return jsonResponse(500, {
        success: false,
        message: "Failed to finalize OTP verification",
        error: consumeError.message,
      });
    }

    return jsonResponse(200, {
      success: true,
      verified: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("email-otp function error:", error);
    return jsonResponse(500, {
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
