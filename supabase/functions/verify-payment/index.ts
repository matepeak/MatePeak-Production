// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { emailTemplates } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-payment-webhook-secret, x-razorpay-signature",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

const paymentWebhookSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET") ?? "";
const internalFunctionSecret =
  Deno.env.get("INTERNAL_FUNCTION_SECRET") || Deno.env.get("PAYMENT_WEBHOOK_SECRET") || "";
const razorpayWebhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const siteUrl = Deno.env.get("SITE_URL") ?? "https://matepeak.com";

const SUCCESS_STATUSES = new Set(["success", "paid", "completed", "captured"]);
const FAILED_STATUSES = new Set(["failed", "failure", "cancelled", "canceled"]);
const PERSISTED_SUCCESS_PAYMENT_STATUSES = new Set(["paid", "completed", "free"]);

const sessionTypeMap: Record<string, string> = {
  oneOnOneSession: "1:1 Mentoring Session",
  chatAdvice: "Chat Advice",
  digitalProducts: "Digital Product",
  notes: "Session Notes",
};

interface BookingRecord {
  id: string;
  user_id: string;
  expert_id: string;
  session_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_id?: string;
  meeting_link?: string;
  message?: string;
  user_timezone?: string;
  mentor_timezone?: string;
  user?: {
    full_name?: string;
    email?: string;
  };
  expert?: {
    full_name?: string;
    email?: string;
    username?: string;
  };
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeStatus = (status?: string | null) => (status ?? "").trim().toLowerCase();

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const safeEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const hmacSha256Hex = async (secret: string, data: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(signature);
};

const extractBookingId = (payload: any): string | null => {
  const direct = payload?.booking_id || payload?.bookingId || payload?.actualBookingId;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const notes = payload?.notes || payload?.metadata || payload?.meta;
  const notesId = notes?.booking_id || notes?.bookingId || notes?.actualBookingId;
  if (typeof notesId === "string" && notesId.length > 0) return notesId;

  const razorpayNotes = payload?.payload?.payment?.entity?.notes;
  const razorpayId =
    razorpayNotes?.actualBookingId || razorpayNotes?.booking_id || razorpayNotes?.bookingId;
  if (typeof razorpayId === "string" && razorpayId.length > 0) return razorpayId;

  return null;
};

const extractPaymentStatus = (payload: any): string => {
  if (typeof payload?.status === "string") return normalizeStatus(payload.status);

  if (payload?.razorpay_order_id && payload?.razorpay_payment_id && payload?.razorpay_signature) {
    return "success";
  }

  const event = normalizeStatus(payload?.event);
  if (event === "payment.captured" || event === "order.paid") return "success";
  if (event === "payment.failed") return "failed";

  const nestedStatus = payload?.payload?.payment?.entity?.status;
  if (typeof nestedStatus === "string") return normalizeStatus(nestedStatus);

  return "";
};

const extractPaymentId = (payload: any): string | null => {
  const direct =
    payload?.payment_id || payload?.paymentId || payload?.razorpay_payment_id || payload?.id;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const nested = payload?.payload?.payment?.entity?.id;
  if (typeof nested === "string" && nested.length > 0) return nested;

  return null;
};

const extractOrderId = (payload: any): string | null => {
  const direct = payload?.order_id || payload?.orderId || payload?.razorpay_order_id;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const nested = payload?.payload?.order?.entity?.id || payload?.payload?.payment?.entity?.order_id;
  if (typeof nested === "string" && nested.length > 0) return nested;

  return null;
};

const sendEmail = async (to: string, subject: string, html: string) => {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "MatePeak <support@matepeak.com>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Resend error (${res.status}): ${errorBody}`);
  }
};

const triggerPaymentSuccessEmails = async (bookingId: string) => {
  const res = await fetch(`${supabaseUrl}/functions/v1/payment-success-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "x-internal-secret": internalFunctionSecret,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      `payment-success-emails failed (${res.status}): ${data?.message || "Unknown error"}`
    );
  }

  if (!data?.success) {
    throw new Error(
      `payment-success-emails did not complete: ${data?.message || "Unknown error"}`
    );
  }

  return data;
};

const buildFailureHtml = (args: {
  recipientName: string;
  otherPersonName: string;
  role: "student" | "mentor";
  serviceName: string;
  date: string;
  time: string;
  timezone: string;
  amount: number;
  dashboardLink: string;
}) => {
  const roleLine =
    args.role === "student"
      ? `Your payment for the session with <strong>${args.otherPersonName}</strong> did not go through.`
      : `The payment for the session booked with <strong>${args.otherPersonName}</strong> did not go through.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #991b1b; color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: 500; }
    .detail-value { color: #111827; font-weight: 600; }
    .button { display: inline-block; background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Failed</h1>
    </div>
    <div class="content">
      <p>Hi ${args.recipientName},</p>
      <p>${roleLine}</p>

      <div class="card">
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${args.serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${args.date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${args.time} (${args.timezone})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount</span>
          <span class="detail-value">INR ${args.amount}</span>
        </div>
      </div>

      <p>Please try booking again from your dashboard.</p>

      <p style="text-align: center; margin-top: 24px;">
        <a class="button" href="${args.dashboardLink}">Open Dashboard</a>
      </p>
    </div>

    <div class="footer">
      <p>Need help? <a href="mailto:support@matepeak.com">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
  `;
};

const authenticateWebhook = async (req: Request, payload: any, rawBody: string) => {
  const headerWebhookSecret =
    req.headers.get("x-payment-webhook-secret") || req.headers.get("x-webhook-secret") || "";

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (paymentWebhookSecret && (headerWebhookSecret || bearer)) {
    const provided = headerWebhookSecret || bearer;
    if (safeEquals(provided, paymentWebhookSecret)) {
      return { ok: true, method: "shared-secret" };
    }
  }

  const razorpayHeaderSignature = req.headers.get("x-razorpay-signature") || "";
  if (razorpayHeaderSignature && razorpayWebhookSecret) {
    const expected = await hmacSha256Hex(razorpayWebhookSecret, rawBody);
    if (safeEquals(expected, razorpayHeaderSignature)) {
      return { ok: true, method: "razorpay-webhook-signature" };
    }
    return { ok: false, reason: "Invalid Razorpay webhook signature" };
  }

  const bodySignature = payload?.razorpay_signature;
  const orderId = payload?.razorpay_order_id || payload?.order_id;
  const paymentId = payload?.razorpay_payment_id || payload?.payment_id;
  if (bodySignature && orderId && paymentId && razorpayKeySecret) {
    const expected = await hmacSha256Hex(razorpayKeySecret, `${orderId}|${paymentId}`);
    if (safeEquals(expected, String(bodySignature))) {
      return { ok: true, method: "razorpay-checkout-signature" };
    }
    return { ok: false, reason: "Invalid Razorpay checkout signature" };
  }

  if (!paymentWebhookSecret && !razorpayWebhookSecret && !razorpayKeySecret) {
    return { ok: false, reason: "No webhook secret configured" };
  }

  return { ok: false, reason: "Missing valid webhook authentication" };
};

const updateBookingStatusWithFallback = async (
  supabase: ReturnType<typeof createClient>,
  bookingId: string,
  updateData: Record<string, unknown>,
  paymentStatusCandidates: string[],
) => {
  let lastError: unknown = null;

  for (const paymentStatus of paymentStatusCandidates) {
    const payload = { ...updateData, payment_status: paymentStatus, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("bookings")
      .update(payload)
      .eq("id", bookingId)
      .select("*")
      .single();

    if (!error) {
      return { data: data as BookingRecord, usedPaymentStatus: paymentStatus };
    }

    lastError = error;
  }

  throw lastError;
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
    const rawBody = await req.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};

    const auth = await authenticateWebhook(req, payload, rawBody);
    if (!auth.ok) {
      return jsonResponse(401, {
        success: false,
        message: "Webhook authentication failed",
        reason: auth.reason,
      });
    }

    const bookingId = extractBookingId(payload);
    const status = extractPaymentStatus(payload);
    const paymentId = extractPaymentId(payload);
    const orderId = extractOrderId(payload);

    if (!bookingId) {
      return jsonResponse(400, { success: false, message: "Missing booking_id in payload" });
    }

    if (!status) {
      return jsonResponse(400, { success: false, message: "Missing payment status in payload" });
    }

    const normalized = normalizeStatus(status);
    const isSuccess = SUCCESS_STATUSES.has(normalized);
    const isFailure = FAILED_STATUSES.has(normalized);

    if (!isSuccess && !isFailure) {
      return jsonResponse(400, {
        success: false,
        message: `Unsupported payment status: ${status}`,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError) {
      return jsonResponse(500, {
        success: false,
        message: "Failed to load booking",
        error: fetchError.message,
      });
    }

    if (!existingBooking) {
      return jsonResponse(404, { success: false, message: `Booking not found for id ${bookingId}` });
    }

    const booking = existingBooking as BookingRecord;
    const normalizedStoredPaymentStatus = normalizeStatus(booking.payment_status);
    const alreadySuccessful =
      normalizedStoredPaymentStatus === "free"
        ? Number(booking.total_amount || 0) <= 0
        : PERSISTED_SUCCESS_PAYMENT_STATUSES.has(normalizedStoredPaymentStatus);

    if (isFailure && alreadySuccessful) {
      return jsonResponse(200, {
        success: true,
        idempotent: true,
        message: "Ignoring failure webhook because booking is already successful",
        booking_id: bookingId,
      });
    }

    let updatedBooking = booking;
    let usedPaymentStatus = booking.payment_status;
    let emailsTriggered = false;
    let confirmationConflict = false;
    let paymentSuccessEmailStatus: "sent" | "failed" | "skipped" = "skipped";
    let paymentSuccessEmailResult: Record<string, unknown> | null = null;

    if (isSuccess && !alreadySuccessful) {
      const { data: confirmData, error: confirmError } = await supabase.rpc(
        "confirm_booking_after_payment",
        {
          p_booking_id: bookingId,
          p_payment_id: paymentId ?? null,
          p_order_id: orderId ?? null,
        },
      );

      if (confirmError) {
        throw confirmError;
      }

      const confirmResult = Array.isArray(confirmData) ? confirmData[0] : confirmData;
      if (!confirmResult?.success && confirmResult?.code !== "slot_conflict") {
        throw new Error(confirmResult?.message || "Failed to confirm booking atomically");
      }

      confirmationConflict = confirmResult?.code === "slot_conflict";

      const { data: refreshedBooking, error: refreshError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (refreshError) {
        throw refreshError;
      }

      updatedBooking = refreshedBooking as BookingRecord;
      usedPaymentStatus = updatedBooking.payment_status;
      emailsTriggered = true;
    } else if (isFailure) {
      const updateData: Record<string, unknown> = {
        status: "cancelled",
      };

      if (paymentId) updateData.payment_id = paymentId;

      const result = await updateBookingStatusWithFallback(supabase, bookingId, updateData, [
        "failed",
        "pending",
      ]);
      updatedBooking = result.data;
      usedPaymentStatus = result.usedPaymentStatus;
      emailsTriggered = true;
    }

    if (emailsTriggered) {
      const serviceName = sessionTypeMap[updatedBooking.session_type] ?? updatedBooking.session_type;
      const studentName = updatedBooking.user?.full_name || "there";
      const mentorName =
        updatedBooking.expert?.full_name || updatedBooking.expert?.username || "Mentor";

      const studentEmail = updatedBooking.user?.email;
      const mentorEmail = updatedBooking.expert?.email;

      const date = formatDate(updatedBooking.scheduled_date);
      const time = updatedBooking.scheduled_time;
      const studentTimezone = updatedBooking.user_timezone || "IST";
      const mentorTimezone = updatedBooking.mentor_timezone || "IST";
      const amount = Number(updatedBooking.total_amount || 0);

      if (isSuccess && !confirmationConflict) {
        try {
          paymentSuccessEmailResult = await triggerPaymentSuccessEmails(bookingId);
          paymentSuccessEmailStatus = "sent";
        } catch (emailError) {
          console.error("payment-success-emails trigger failed:", emailError);
          paymentSuccessEmailStatus = "failed";
          paymentSuccessEmailResult = {
            success: false,
            message: emailError instanceof Error ? emailError.message : "Unknown email trigger error",
          };
        }
      } else {
        const studentHtml = buildFailureHtml({
          recipientName: studentName,
          otherPersonName: mentorName,
          role: "student",
          serviceName,
          date,
          time,
          timezone: studentTimezone,
          amount,
          dashboardLink: `${siteUrl}/dashboard`,
        });

        const mentorHtml = buildFailureHtml({
          recipientName: mentorName,
          otherPersonName: studentName,
          role: "mentor",
          serviceName,
          date,
          time,
          timezone: mentorTimezone,
          amount,
          dashboardLink: `${siteUrl}/mentor/dashboard`,
        });

        const emailTasks: Promise<void>[] = [];
        if (studentEmail) {
          emailTasks.push(
            sendEmail(studentEmail, `Payment Failed: ${serviceName} with ${mentorName}`, studentHtml),
          );
        }
        if (mentorEmail) {
          emailTasks.push(
            sendEmail(mentorEmail, `Booking Payment Failed: ${serviceName}`, mentorHtml),
          );
        }

        await Promise.allSettled(emailTasks);
      }
    }

    return jsonResponse(200, {
      success: true,
      booking_id: bookingId,
      payment_status: usedPaymentStatus,
      booking_status: updatedBooking.status,
      slot_conflict: confirmationConflict,
      event_status: normalized,
      auth_method: auth.method,
      idempotent: isSuccess && alreadySuccessful,
      payment_success_email_status: paymentSuccessEmailStatus,
      payment_success_email_result: paymentSuccessEmailResult,
      message:
        isSuccess && !confirmationConflict
          ? "Payment processed as successful"
          : isSuccess && confirmationConflict
          ? "Payment succeeded but slot was already taken; booking cancelled/refund state applied"
          : "Payment processed as failed",
    });
  } catch (error) {
    console.error("verify-payment error:", error);
    return jsonResponse(500, {
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
