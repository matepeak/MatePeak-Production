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
  componentValues?: string[];
}

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SEND_ATTEMPTS_PER_WINDOW = 2;
const SEND_WINDOW_MINUTES = 30;
const MAX_FAILED_VERIFY_ATTEMPTS = 2;
const LOCKOUT_MINUTES = 15;
const OTP_EXPIRY_SECONDS = 300;

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (phone: string) =>
  String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");

const isValidIntlPhone = (phone: string): boolean => /^\d{8,15}$/.test(phone);

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
};

const generateOtp = (): string => {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return (bytes[0] % 1000000).toString().padStart(6, "0");
};

const normalizePath = (path: string): string => {
  const value = String(path || "").trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
};

const extractFirstHttpUrl = (value: string): string => {
  const match = String(value || "").match(/https?:\/\/[^\s'"`]+/i);
  return match ? match[0] : "";
};

const resolveBaseUrl = (value: string, fallback: string): string => {
  const raw = String(value || "").trim();
  const candidate = raw ? extractFirstHttpUrl(raw) || raw : fallback;

  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol)) {
      throw new Error("Unsupported protocol");
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
};

const ensureValidMsg91Path = (path: string, envName: string): string => {
  const raw = String(path || "").trim();
  const matchedPath = raw.match(/\/api\/[A-Za-z0-9._\/-]+/);
  const value = matchedPath ? matchedPath[0] : raw;
  if (!value) {
    throw new Error(`Missing ${envName}`);
  }

  if (/\s|file:\/\//i.test(value)) {
    throw new Error(
      `Invalid ${envName}. Expected path like /api/v5/whatsapp/..., got malformed value.`
    );
  }

  const normalized = normalizePath(value);
  if (!normalized.startsWith("/api/")) {
    throw new Error(`Invalid ${envName}. Path must start with /api/.`);
  }

  return normalized;
};

const normalizeBaseUrl = (baseUrl: string): string => String(baseUrl || "").replace(/\/$/, "");

const buildOtpComponents = (otp: string, componentValues: string[] = []) => {
  const values = componentValues.length ? componentValues : [otp];
  const components: Record<string, { type: "text"; value: string }> = {};

  values.forEach((value, index) => {
    components[`body_${index + 1}`] = {
      type: "text",
      value: index === 0 ? otp : String(value || ""),
    };
  });

  return components;
};

const sendMsg91OtpTemplate = async (params: {
  authKey: string;
  baseUrl: string;
  templatePath: string;
  integratedNumber: string;
  recipientNumber: string;
  templateName: string;
  languageCode: string;
  componentValues?: string[];
  otp: string;
}) => {
  const url = new URL(`${normalizeBaseUrl(params.baseUrl)}${params.templatePath}`);
  const body = {
    integrated_number: params.integratedNumber,
    content_type: "template",
    payload: {
      type: "template",
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode,
          policy: "deterministic",
        },
        to_and_components: [
          {
            to: [params.recipientNumber],
            components: buildOtpComponents(params.otp, params.componentValues || []),
          },
        ],
      },
      messaging_product: "whatsapp",
    },
  };

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      accept: "application/json",
      authkey: params.authKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message = String(payload?.message || payload?.error || text || "MSG91 request failed").trim();
    throw new Error(`MSG91 WhatsApp template failed (${response.status}): ${message}`);
  }

  return payload || {};
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY") ?? "";
  const msg91BaseUrl = resolveBaseUrl(
    Deno.env.get("MSG91_BASE_URL") ?? "",
    "https://control.msg91.com"
  );
  const msg91IntegratedNumber = Deno.env.get("MSG91_OTP_INTEGRATED_NUMBER") ?? "";
  const msg91TemplateName = Deno.env.get("MSG91_OTP_TEMPLATE_NAME") ?? "";
  const msg91LanguageCode = Deno.env.get("MSG91_OTP_TEMPLATE_LANGUAGE") ?? "en";
  const msg91TemplatePath = ensureValidMsg91Path(
    Deno.env.get("MSG91_WHATSAPP_TEMPLATE_SEND_PATH") || "/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    "MSG91_WHATSAPP_TEMPLATE_SEND_PATH"
  );

  if (!msg91AuthKey || !msg91IntegratedNumber || !msg91TemplateName) {
    return jsonResponse(500, {
      success: false,
      message:
        "Missing MSG91 OTP secrets. Set MSG91_AUTH_KEY, MSG91_OTP_INTEGRATED_NUMBER, MSG91_OTP_TEMPLATE_NAME.",
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

    if (!isValidIntlPhone(phone)) {
      return jsonResponse(400, {
        success: false,
        message: "Phone must include country code digits (example: 919876543210).",
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
      const otp = generateOtp();
      const otpHash = await sha256Hex(otp);

      const result = await sendMsg91OtpTemplate({
        authKey: msg91AuthKey,
        baseUrl: msg91BaseUrl,
        templatePath: msg91TemplatePath,
        integratedNumber: msg91IntegratedNumber,
        recipientNumber: phone,
        templateName: msg91TemplateName,
        languageCode: msg91LanguageCode,
        componentValues: Array.isArray(body?.componentValues)
          ? body.componentValues.map((item) => String(item || ""))
          : undefined,
        otp,
      });

      const { data: updatedState, error: updateError } = await supabase
        .from("phone_otp_attempts")
        .update({
          otp_requests_count: Number(attemptState.otp_requests_count || 0) + 1,
          last_otp_requested_at: now.toISOString(),
          otp_hash: otpHash,
          otp_expires_at: new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000).toISOString(),
          failed_verify_attempts: 0,
          locked_until: null,
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
        message: "OTP sent successfully on WhatsApp",
        status: "sent",
        to: phone,
        channel: "whatsapp_template",
        provider_response: result,
        resend_available_in_seconds: RESEND_COOLDOWN_SECONDS,
        expires_in_seconds: OTP_EXPIRY_SECONDS,
        send_attempts_used: updatedState.otp_requests_count,
        send_attempts_limit: MAX_SEND_ATTEMPTS_PER_WINDOW,
        send_attempts_remaining: Math.max(0, MAX_SEND_ATTEMPTS_PER_WINDOW - Number(updatedState.otp_requests_count || 0)),
      });
    }

    const otp = String(body?.otp || "").trim();
    if (!/^\d{6}$/.test(otp)) {
      return jsonResponse(400, {
        success: false,
        message: "OTP must be exactly 6 digits.",
      });
    }

    const currentHash = String(attemptState?.otp_hash || "").trim();
    const currentExpiry = String(attemptState?.otp_expires_at || "").trim();

    if (!currentHash || !currentExpiry) {
      return jsonResponse(400, {
        success: false,
        message: "No active OTP found. Please send OTP again.",
      });
    }

    if (new Date(currentExpiry).getTime() <= now.getTime()) {
      const { error: expireUpdateError } = await supabase
        .from("phone_otp_attempts")
        .update({
          otp_hash: null,
          otp_expires_at: null,
          updated_at: now.toISOString(),
        })
        .eq("id", attemptState.id);

      if (expireUpdateError) {
        throw new Error(`Failed to clear expired OTP state: ${expireUpdateError.message}`);
      }

      return jsonResponse(400, {
        success: false,
        message: "OTP expired. Please request a new OTP.",
      });
    }

    const otpHash = await sha256Hex(otp);
    if (otpHash !== currentHash) {
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
        status: "invalid_otp",
        to: phone,
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
        otp_hash: null,
        otp_expires_at: null,
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
      status: "verified",
      to: phone,
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
