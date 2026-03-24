// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PhoneOtpRequest {
  action: "send" | "verify";
  phone: string;
  otp?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SEND_ATTEMPTS_PER_WINDOW = 2;
const SEND_WINDOW_MINUTES = 30;
const MAX_FAILED_VERIFY_ATTEMPTS = 2;
const LOCKOUT_MINUTES = 15;

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (phone: string) =>
  String(phone || "")
    .trim()
    .replace(/[\s\-().]/g, "");

const isValidE164 = (phone: string): boolean => {
  // E.164 max length is 15 digits and must start with +.
  return /^\+[1-9]\d{7,14}$/.test(phone);
};

const toFormUrlEncoded = (payload: Record<string, string>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    params.append(key, value);
  }
  return params.toString();
};

const fetchTwilioVerify = async (
  method: "send" | "verify",
  payload: Record<string, string>,
  accountSid: string,
  authToken: string,
  serviceSid: string,
) => {
  const base = `https://verify.twilio.com/v2/Services/${serviceSid}`;
  const endpoint = method === "send" ? `${base}/Verifications` : `${base}/VerificationCheck`;

  const auth = btoa(`${accountSid}:${authToken}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toFormUrlEncoded(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.message || (data as any)?.detail || "Twilio Verify request failed";
    throw new Error(`Twilio Verify failed (${response.status}): ${message}`);
  }

  return data as any;
};

const secondsBetween = (futureIso: string, now: Date): number => {
  const diffMs = new Date(futureIso).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 1000));
};

const getOrCreateAttemptState = async (supabase: any, phone: string) => {
  const { data, error } = await supabase
    .from("phone_otp_attempts")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read OTP attempt state: ${error.message}`);
  }

  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from("phone_otp_attempts")
    .insert({ phone })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(`Failed to initialize OTP attempt state: ${insertError.message}`);
  }

  return inserted;
};

const normalizeAttemptState = async (supabase: any, state: any, now: Date) => {
  let next = { ...state };
  let changed = false;

  const windowStart = new Date(next.request_window_started_at || now.toISOString());
  const windowExpired = now.getTime() - windowStart.getTime() >= SEND_WINDOW_MINUTES * 60 * 1000;

  if (windowExpired) {
    next.otp_requests_count = 0;
    next.request_window_started_at = now.toISOString();
    next.last_otp_requested_at = null;
    changed = true;
  }

  if (next.locked_until && new Date(next.locked_until).getTime() <= now.getTime()) {
    next.locked_until = null;
    next.failed_verify_attempts = 0;
    changed = true;
  }

  if (changed) {
    const { data: updated, error } = await supabase
      .from("phone_otp_attempts")
      .update({
        otp_requests_count: next.otp_requests_count,
        request_window_started_at: next.request_window_started_at,
        last_otp_requested_at: next.last_otp_requested_at,
        locked_until: next.locked_until,
        failed_verify_attempts: next.failed_verify_attempts,
        updated_at: now.toISOString(),
      })
      .eq("id", next.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to normalize OTP attempt state: ${error.message}`);
    }

    return updated;
  }

  return next;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, message: "Method not allowed" });
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!accountSid || !authToken || !verifyServiceSid) {
    return jsonResponse(500, {
      success: false,
      message: "Missing Twilio Verify secrets. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.",
    });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, {
      success: false,
      message: "Missing Supabase function secrets. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = (await req.json()) as PhoneOtpRequest;
    const action = body?.action;
    const phone = normalizePhone(body?.phone || "");
    const now = new Date();

    if (!action || (action !== "send" && action !== "verify")) {
      return jsonResponse(400, {
        success: false,
        message: "Invalid action. Use 'send' or 'verify'.",
      });
    }

    if (!isValidE164(phone)) {
      return jsonResponse(400, {
        success: false,
        message: "Phone must be in E.164 format (example: +919876543210).",
      });
    }

    let attemptState = await getOrCreateAttemptState(supabase, phone);
    attemptState = await normalizeAttemptState(supabase, attemptState, now);

    if (attemptState.locked_until && new Date(attemptState.locked_until).getTime() > now.getTime()) {
      return jsonResponse(429, {
        success: false,
        message: "Too many failed OTP attempts. Phone verification is temporarily locked.",
        locked_until: attemptState.locked_until,
        retry_after_seconds: secondsBetween(attemptState.locked_until, now),
      });
    }

    if (action === "send") {
      if (attemptState.otp_requests_count >= MAX_SEND_ATTEMPTS_PER_WINDOW) {
        const windowEndsAt = new Date(
          new Date(attemptState.request_window_started_at).getTime() + SEND_WINDOW_MINUTES * 60 * 1000,
        );

        return jsonResponse(429, {
          success: false,
          message: `Maximum ${MAX_SEND_ATTEMPTS_PER_WINDOW} OTP requests reached. Try again later.`,
          send_attempts_used: attemptState.otp_requests_count,
          send_attempts_limit: MAX_SEND_ATTEMPTS_PER_WINDOW,
          window_ends_at: windowEndsAt.toISOString(),
          retry_after_seconds: secondsBetween(windowEndsAt.toISOString(), now),
        });
      }

      if (attemptState.last_otp_requested_at) {
        const lastSentAt = new Date(attemptState.last_otp_requested_at);
        const nextAllowedAt = new Date(lastSentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
        if (nextAllowedAt.getTime() > now.getTime()) {
          return jsonResponse(429, {
            success: false,
            message: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP.`,
            next_allowed_at: nextAllowedAt.toISOString(),
            retry_after_seconds: secondsBetween(nextAllowedAt.toISOString(), now),
          });
        }
      }

      const result = await fetchTwilioVerify(
        "send",
        {
          To: phone,
          Channel: "sms",
        },
        accountSid,
        authToken,
        verifyServiceSid,
      );

      const { data: updatedState, error: updateError } = await supabase
        .from("phone_otp_attempts")
        .update({
          otp_requests_count: Number(attemptState.otp_requests_count || 0) + 1,
          last_otp_requested_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", attemptState.id)
        .select("*")
        .single();

      if (updateError) {
        throw new Error(`Failed to update OTP send state: ${updateError.message}`);
      }

      return jsonResponse(200, {
        success: true,
        message: "OTP sent successfully",
        status: result?.status || "pending",
        to: result?.to || phone,
        channel: result?.channel || "sms",
        sid: result?.sid || null,
        resend_available_in_seconds: RESEND_COOLDOWN_SECONDS,
        send_attempts_used: updatedState.otp_requests_count,
        send_attempts_limit: MAX_SEND_ATTEMPTS_PER_WINDOW,
        send_attempts_remaining: Math.max(0, MAX_SEND_ATTEMPTS_PER_WINDOW - Number(updatedState.otp_requests_count || 0)),
      });
    }

    const otp = String(body?.otp || "").trim();
    if (!/^\d{4,10}$/.test(otp)) {
      return jsonResponse(400, {
        success: false,
        message: "OTP must be numeric (4-10 digits).",
      });
    }

    const result = await fetchTwilioVerify(
      "verify",
      {
        To: phone,
        Code: otp,
      },
      accountSid,
      authToken,
      verifyServiceSid,
    );

    const approved = String(result?.status || "").toLowerCase() === "approved";

    if (!approved) {
      const nextFailedAttempts = Number(attemptState.failed_verify_attempts || 0) + 1;
      const lockedUntil =
        nextFailedAttempts >= MAX_FAILED_VERIFY_ATTEMPTS
          ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : null;

      const { error: failUpdateError } = await supabase
        .from("phone_otp_attempts")
        .update({
          failed_verify_attempts: nextFailedAttempts,
          locked_until: lockedUntil,
          updated_at: now.toISOString(),
        })
        .eq("id", attemptState.id);

      if (failUpdateError) {
        throw new Error(`Failed to update OTP verify state: ${failUpdateError.message}`);
      }

      return jsonResponse(400, {
        success: false,
        verified: false,
        message:
          nextFailedAttempts >= MAX_FAILED_VERIFY_ATTEMPTS
            ? `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`
            : "OTP verification failed",
        status: result?.status || "unknown",
        to: result?.to || phone,
        sid: result?.sid || null,
        failed_attempts_used: nextFailedAttempts,
        failed_attempts_limit: MAX_FAILED_VERIFY_ATTEMPTS,
        locked_until: lockedUntil,
      });
    }

    const { error: successUpdateError } = await supabase
      .from("phone_otp_attempts")
      .update({
        failed_verify_attempts: 0,
        locked_until: null,
        otp_requests_count: 0,
        request_window_started_at: now.toISOString(),
        verified_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", attemptState.id);

    if (successUpdateError) {
      throw new Error(`Failed to update OTP success state: ${successUpdateError.message}`);
    }

    return jsonResponse(200, {
      success: true,
      verified: true,
      message: "Phone number verified successfully",
      status: result?.status || "unknown",
      to: result?.to || phone,
      sid: result?.sid || null,
      errors: [],
    });
  } catch (error) {
    console.error("phone-otp function error:", error);
    return jsonResponse(500, {
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
