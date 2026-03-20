// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const siteUrl = Deno.env.get("SITE_URL") ?? "https://matepeak.com";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFrom = Deno.env.get("RESEND_FROM") || "MatePeak <onboarding@resend.dev>";
const internalFunctionSecret =
  Deno.env.get("INTERNAL_FUNCTION_SECRET") || Deno.env.get("PAYMENT_WEBHOOK_SECRET") || "";

const sessionTypeMap: Record<string, string> = {
  oneOnOneSession: "1:1 Mentoring Session",
  chatAdvice: "Chat Advice",
  priorityDm: "Priority DM",
  digitalProducts: "Digital Product",
  notes: "Session Notes",
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const buildStudentBookingConfirmationEmail = (data: {
  studentName: string;
  mentorName: string;
  serviceType: string;
  serviceName: string;
  date: string;
  time: string;
  timezone: string;
  duration: number;
  amount: number;
  meetingLink?: string;
}) => {
  const isScheduled = data.serviceType === "oneOnOneSession";
  const primaryActionUrl = data.meetingLink || `${siteUrl}/dashboard`;
  const primaryActionLabel = data.meetingLink ? "Join Meeting" : "Open Dashboard";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 28px 14px; background-color: #f9fafb; color: #111827; }
.container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
.header { background-color: #ffffff; padding: 30px 32px 12px; text-align: left; }
.title { margin: 0; font-size: 28px; line-height: 1.25; color: #111827; }
.subtitle { margin: 10px 0 0; color: #4b5563; font-size: 15px; }
.content { padding: 12px 32px 30px; }
.details { background-color: #ffffff; border: 2px solid #111827; border-radius: 14px; padding: 18px 18px 10px; margin: 20px 0; }
.details-heading { margin: 0 0 8px; font-size: 18px; color: #111827; }
.detail-row { display: flex; justify-content: space-between; gap: 18px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: #6b7280; font-weight: 600; }
.detail-value { color: #111827; font-weight: 700; text-align: right; }
.cta-wrap { text-align: center; margin-top: 24px; }
.cta { display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; }
.footer { padding: 0 32px 26px; color: #6b7280; font-size: 13px; }
</style></head>
<body>
<div class="container">
<div class="header"><h1 class="title">${data.serviceType === "digitalProducts" ? "Digital Product Confirmed" : "Booking Confirmed"}</h1><p class="subtitle">Your request has been successfully confirmed.</p></div>
<div class="content">
<p>Hi ${data.studentName},</p>
<p>Your booking with <strong>${data.mentorName}</strong> is confirmed.</p>
<div class="details">
<h2 class="details-heading">Order Details</h2>
<div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${data.serviceName}</span></div>
${isScheduled ? `<div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${data.date}</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${data.time} (${data.timezone})</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${data.duration} minutes</span></div>` : ""}
<div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value">INR ${data.amount}</span></div>
</div>
<div class="cta-wrap"><a class="cta" href="${primaryActionUrl}">${primaryActionLabel}</a></div>
</div><div class="footer">Need help? Contact support@matepeak.com</div></div></body></html>
  `;

  return {
    subject: `Booking confirmed with ${data.mentorName}`,
    html,
  };
};

const buildMentorBookingConfirmationEmail = (data: {
  mentorName: string;
  studentName: string;
  serviceType: string;
  serviceName: string;
  date: string;
  time: string;
  timezone: string;
  duration: number;
  earnings: number;
  purpose?: string;
  dashboardLink: string;
}) => {
  const isScheduled = data.serviceType === "oneOnOneSession";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 28px 14px; background-color: #f9fafb; color: #111827; }
.container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
.header { background-color: #ffffff; padding: 30px 32px 12px; text-align: left; }
.title { margin: 0; font-size: 28px; line-height: 1.25; color: #111827; }
.subtitle { margin: 10px 0 0; color: #4b5563; font-size: 15px; }
.content { padding: 12px 32px 30px; }
.details { background-color: #ffffff; border: 2px solid #111827; border-radius: 14px; padding: 18px 18px 10px; margin: 20px 0; }
.details-heading { margin: 0 0 8px; font-size: 18px; color: #111827; }
.detail-row { display: flex; justify-content: space-between; gap: 18px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: #6b7280; font-weight: 600; }
.detail-value { color: #111827; font-weight: 700; text-align: right; }
.cta-wrap { text-align: center; margin-top: 24px; }
.cta { display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; }
.footer { padding: 0 32px 26px; color: #6b7280; font-size: 13px; }
</style></head>
<body>
<div class="container">
<div class="header"><h1 class="title">New Paid Booking</h1><p class="subtitle">A student has confirmed a booking with you.</p></div>
<div class="content">
<p>Hi ${data.mentorName},</p>
<p>You have a confirmed paid booking from <strong>${data.studentName}</strong>.</p>
<div class="details">
<h2 class="details-heading">Booking Details</h2>
<div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${data.serviceName}</span></div>
${isScheduled ? `<div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${data.date}</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${data.time} (${data.timezone})</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${data.duration} minutes</span></div>` : ""}
<div class="detail-row"><span class="detail-label">Earnings</span><span class="detail-value">INR ${data.earnings}</span></div>
${data.purpose ? `<div class="detail-row"><span class="detail-label">Student Goal</span><span class="detail-value">${data.purpose}</span></div>` : ""}
</div>
<div class="cta-wrap"><a class="cta" href="${data.dashboardLink}">Open Mentor Dashboard</a></div>
</div><div class="footer">Need help? Contact support@matepeak.com</div></div></body></html>
  `;

  return {
    subject: `New booking from ${data.studentName}`,
    html,
  };
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sendViaResend = async (payload: { to: string; subject: string; html: string }) => {
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
      from: resendFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resend failed (${res.status}) to ${payload.to}: ${text}`);
  }

  return await res.json().catch(() => ({ success: true }));
};

const resolveEmailViaAuthAdmin = async (
  supabase: ReturnType<typeof createClient>,
  userId?: string,
): Promise<string> => {
  if (!userId) return "";

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.warn("[payment-success-emails] auth.admin.getUserById failed", {
        userId,
        error: error.message,
      });
      return "";
    }

    return data?.user?.email || "";
  } catch (err) {
    console.warn("[payment-success-emails] auth admin fallback threw", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return "";
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, message: "Method not allowed" });
  }

  const inboundSecret = req.headers.get("x-internal-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  const authorizedBySecret =
    !!internalFunctionSecret && inboundSecret === internalFunctionSecret;
  const authorizedByServiceRoleBearer =
    !!supabaseServiceRoleKey && bearerToken === supabaseServiceRoleKey;

  if (!authorizedBySecret && !authorizedByServiceRoleBearer) {
    return jsonResponse(401, { success: false, message: "Unauthorized internal invocation" });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, { success: false, message: "Missing Supabase environment variables" });
  }

    if (!resendApiKey) {
      return jsonResponse(500, {
        success: false,
        message: "RESEND_API_KEY is not configured",
      });
    }

  try {
    const { booking_id } = await req.json();
    console.info("[payment-success-emails] Request received", { booking_id });

    if (!booking_id || typeof booking_id !== "string") {
      console.error("[payment-success-emails] Invalid booking_id", { booking_id });
      return jsonResponse(400, { success: false, message: "booking_id is required" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .maybeSingle();

    if (bookingError) {
      console.error("[payment-success-emails] Failed to load booking", {
        booking_id,
        error: bookingError.message,
      });
      return jsonResponse(500, {
        success: false,
        message: "Failed to load booking",
        error: bookingError.message,
      });
    }

    if (!booking) {
      console.error("[payment-success-emails] Booking not found", { booking_id });
      return jsonResponse(404, {
        success: false,
        message: "Booking not found",
      });
    }

    console.info("[payment-success-emails] Booking loaded", {
      booking_id,
      status: booking.status,
      payment_status: booking.payment_status,
      user_id: booking.user_id,
      expert_id: booking.expert_id,
    });

    if (booking.status !== "confirmed") {
      console.warn("[payment-success-emails] Booking not confirmed, skipping", {
        booking_id,
        status: booking.status,
      });
      return jsonResponse(400, {
        success: false,
        message: "Booking is not confirmed. Skipping payment-success emails.",
      });
    }

    const serviceName = sessionTypeMap[booking.session_type] ?? booking.session_type;

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.user_id)
      .maybeSingle();

    const { data: mentorProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.expert_id)
      .maybeSingle();

    const { data: mentorExpert } = await supabase
      .from("expert_profiles")
      .select("full_name, username")
      .eq("id", booking.expert_id)
      .maybeSingle();

    const studentName = studentProfile?.full_name || booking.user_name || "there";
    const mentorName =
      mentorExpert?.full_name ||
      mentorProfile?.full_name ||
      mentorExpert?.username ||
      "Mentor";

    const studentEmailFromAuth = await resolveEmailViaAuthAdmin(supabase, booking.user_id);
    const mentorEmailFromAuth = await resolveEmailViaAuthAdmin(supabase, booking.expert_id);

    const studentEmail =
      studentProfile?.email || booking.user_email || studentEmailFromAuth || "";
    const mentorEmail = mentorProfile?.email || mentorEmailFromAuth || "";

    console.info("[payment-success-emails] Resolved recipients", {
      booking_id,
      studentEmail: studentEmail || null,
      mentorEmail: mentorEmail || null,
    });

    const date = formatDate(booking.scheduled_date);
    const time = booking.scheduled_time;
    const studentTimezone = booking.user_timezone || "IST";
    const mentorTimezone = booking.mentor_timezone || "IST";
    const amount = Number(booking.total_amount || 0);

    const studentTemplate = buildStudentBookingConfirmationEmail({
      studentName,
      mentorName,
      serviceType: booking.session_type,
      serviceName,
      date,
      time,
      timezone: studentTimezone,
      duration: booking.duration,
      amount,
      meetingLink: booking.meeting_link,
    });

    const mentorTemplate = buildMentorBookingConfirmationEmail({
      mentorName,
      studentName,
      serviceType: booking.session_type,
      serviceName,
      date,
      time,
      timezone: mentorTimezone,
      duration: booking.duration,
      earnings: amount,
      purpose: booking.message,
      dashboardLink: `${siteUrl}/mentor/dashboard`,
    });

    const tasks: Promise<unknown>[] = [];
    const skipped: string[] = [];
    if (studentEmail) {
      console.info("[payment-success-emails] Queueing student email", {
        booking_id,
        to: studentEmail,
      });
      tasks.push(
        sendViaResend({
          to: studentEmail,
          subject: studentTemplate.subject,
          html: studentTemplate.html,
        }),
      );
    } else {
      skipped.push("student-email-missing");
    }

    if (mentorEmail) {
      console.info("[payment-success-emails] Queueing mentor email", {
        booking_id,
        to: mentorEmail,
      });
      tasks.push(
        sendViaResend({
          to: mentorEmail,
          subject: mentorTemplate.subject,
          html: mentorTemplate.html,
        }),
      );
    } else {
      skipped.push("mentor-email-missing");
    }

    const results = await Promise.allSettled(tasks);
    const failedDetails = results
      .filter((r) => r.status === "rejected")
      .map((r: PromiseRejectedResult) =>
        r.reason instanceof Error ? r.reason.message : String(r.reason)
      );

    const failed = results.filter((r) => r.status === "rejected").length;
    const sent = results.length - failed;

    if (failed > 0 || sent === 0) {
      console.error("[payment-success-emails] Email dispatch incomplete", {
        booking_id,
        sent,
        failed,
        skipped,
        failedDetails,
      });
      return jsonResponse(207, {
        success: false,
        message: `Email dispatch incomplete. sent=${sent}, failed=${failed}`,
        skipped,
        failed_details: failedDetails,
      });
    }

    console.info("[payment-success-emails] Email dispatch completed", {
      booking_id,
      sent,
      skipped,
    });

    return jsonResponse(200, {
      success: true,
      message: "Payment success emails sent",
      sent_count: sent,
      skipped,
    });
  } catch (error) {
    console.error("[payment-success-emails] Unhandled error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return jsonResponse(500, {
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
