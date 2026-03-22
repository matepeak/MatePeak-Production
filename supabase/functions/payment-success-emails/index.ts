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

const getBookingEmailCopy = (
  serviceType: string,
  serviceName: string,
  mentorName: string,
  studentName: string,
) => {
  if (serviceType === "digitalProducts") {
    return {
      studentSubject: `Digital Product Received: ${serviceName} by ${mentorName}`,
      mentorSubject: `Digital Product Order Received: ${serviceName} from ${studentName}`,
      studentHeader: "Digital Product Received",
      mentorHeader: "Digital Product Order Received",
      studentIntro: `Your digital product from ${mentorName} is ready to access.`,
      mentorIntro: `You received a new digital product order from ${studentName}.`,
      detailsTitle: "Order Details",
      studentSubtitle: "",
      mentorSubtitle: "",
    };
  }

  if (serviceType === "priorityDm") {
    return {
      studentSubject: `Priority DM Received: ${serviceName} with ${mentorName}`,
      mentorSubject: `Priority DM Received: ${serviceName} from ${studentName}`,
      studentHeader: "Priority DM Received",
      mentorHeader: "Priority DM Received",
      studentIntro: `Your priority DM request with ${mentorName} was received.`,
      mentorIntro: `You received a new priority DM request from ${studentName}.`,
      detailsTitle: "Request Details",
      studentSubtitle: "",
      mentorSubtitle: "",
    };
  }

  return {
    studentSubject: `Session Confirmed: ${serviceName} with ${mentorName}`,
    mentorSubject: `New Session Scheduled: ${serviceName} with ${studentName}`,
    studentHeader: "Session Confirmed",
    mentorHeader: "New Session Scheduled",
    studentIntro: `Your session with ${mentorName} is confirmed.`,
    mentorIntro: `You have a new session scheduled with ${studentName}.`,
    detailsTitle: "Session Details",
    studentSubtitle: "",
    mentorSubtitle: "",
  };
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

const formatTime24 = (timeValue: string) => {
  const parts = String(timeValue || "").split(":");
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return String(timeValue || "");
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
  productLink?: string;
}) => {
  const isScheduled = data.serviceType === "oneOnOneSession";
  const isDigitalProduct = data.serviceType === "digitalProducts";
  const copy = getBookingEmailCopy(
    data.serviceType,
    data.serviceName,
    data.mentorName,
    data.studentName,
  );
  const primaryActionUrl = isDigitalProduct
    ? data.productLink || `${siteUrl}/dashboard`
    : data.meetingLink || `${siteUrl}/dashboard`;
  const primaryActionLabel = isDigitalProduct
    ? "Access Product"
    : data.meetingLink
    ? "Open Meeting Link"
    : "Open Dashboard";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; }
.container { width: 100%; background-color: #e9ebed; padding: 48px 16px; }
.inner-container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 40px; }
.logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
.header { text-align: center; background: #ffffff; margin-bottom: 28px; }
.title { margin: 0; font-size: 24px; font-weight: 600; color: #111; }
.subtitle { font-size: 14px; color: #555; margin-top: 12px; line-height: 1.6; }
.content { background: #ffffff; }
.content p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
.details { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
.details-heading { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #111; }
.detail-row { font-size: 13px; color: #444; padding: 10px 0; border-bottom: 1px solid #e5e5e5; display: block; }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-weight: 600; color: #111; }
.detail-value { color: #444; }
.cta-wrap { text-align: center; margin: 36px 0; }
.cta { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
.footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; background: #ffffff; }
.link { color: #000; text-decoration: none; font-weight: 500; }
</style></head>
<body>
<div class="container"><div class="inner-container">
<div class="logo">MatePeak</div>
<div class="header"><h1 class="title">${copy.studentHeader}</h1>${copy.studentSubtitle ? `<p class="subtitle">${copy.studentSubtitle}</p>` : ""}</div>
<div class="content">
<p>Hi ${data.studentName},</p>
<p>${copy.studentIntro}</p>
<div class="details">
<h2 class="details-heading">${copy.detailsTitle}</h2>
<div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${data.serviceName}</span></div>
<div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${data.mentorName}</span></div>
${isScheduled ? `<div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${data.date}</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Schedule</span><span class="detail-value">${formatTime24(data.time)} (${data.timezone})</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${data.duration} minutes</span></div>` : ""}
<div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value">INR ${data.amount}</span></div>
</div>
${isDigitalProduct && data.productLink ? `<div class="cta-wrap"><a class="cta" href="${data.productLink}">Access Product</a></div><p style="font-size: 13px; color: #555; margin-top: 8px;">Product link: <a href="${data.productLink}" class="link">${data.productLink}</a></p>` : ""}
${isScheduled && data.meetingLink ? `<div class="cta-wrap"><a class="cta" href="${data.meetingLink}">Open Meeting Link</a></div><p style="font-size: 13px; color: #555; margin-top: 8px;">Meeting link: <a href="${data.meetingLink}" class="link">${data.meetingLink}</a></p>` : ""}
${!isScheduled && !isDigitalProduct ? `<div class="cta-wrap"><a class="cta" href="${siteUrl}/dashboard">Open Dashboard</a></div>` : ""}
</div><div class="footer">Need help? <a href="mailto:support@matepeak.com" class="link">Contact Support</a></div></div></div></body></html>
  `;

  return {
    subject: copy.studentSubject,
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
  const copy = getBookingEmailCopy(
    data.serviceType,
    data.serviceName,
    data.mentorName,
    data.studentName,
  );
  const messageLabel = data.serviceType === "priorityDm" ? "Student Message" : "Student Goal";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; }
.container { width: 100%; background-color: #e9ebed; padding: 48px 16px; }
.inner-container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 40px; }
.logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
.header { text-align: center; background: #ffffff; margin-bottom: 28px; }
.title { margin: 0; font-size: 24px; font-weight: 600; color: #111; }
.subtitle { font-size: 14px; color: #555; margin-top: 12px; line-height: 1.6; }
.content { background: #ffffff; }
.content p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
.details { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
.details-heading { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #111; }
.detail-row { font-size: 13px; color: #444; padding: 10px 0; border-bottom: 1px solid #e5e5e5; display: block; }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-weight: 600; color: #111; }
.detail-value { color: #444; }
.cta-wrap { text-align: center; margin: 36px 0; }
.cta { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
.footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; background: #ffffff; }
.link { color: #000; text-decoration: none; font-weight: 500; }
</style></head>
<body>
<div class="container"><div class="inner-container">
<div class="logo">MatePeak</div>
<div class="header"><h1 class="title">${copy.mentorHeader}</h1>${copy.mentorSubtitle ? `<p class="subtitle">${copy.mentorSubtitle}</p>` : ""}</div>
<div class="content">
<p>Hi ${data.mentorName},</p>
<p>${copy.mentorIntro}</p>
<div class="details">
<h2 class="details-heading">${copy.detailsTitle}</h2>
<div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${data.serviceName}</span></div>
<div class="detail-row"><span class="detail-label">Student</span><span class="detail-value">${data.studentName}</span></div>
${isScheduled ? `<div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${data.date}</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Schedule</span><span class="detail-value">${formatTime24(data.time)} (${data.timezone})</span></div>` : ""}
${isScheduled ? `<div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${data.duration} minutes</span></div>` : ""}
<div class="detail-row"><span class="detail-label">Earnings</span><span class="detail-value">INR ${data.earnings}</span></div>
${data.purpose ? `<div class="detail-row"><span class="detail-label">${messageLabel}</span><span class="detail-value">${data.purpose}</span></div>` : ""}
</div>
<div class="cta-wrap"><a class="cta" href="${data.dashboardLink}">Open Mentor Dashboard</a></div>
</div><div class="footer">Need help? <a href="mailto:support@matepeak.com" class="link">Contact Support</a></div></div></div></body></html>
  `;

  return {
    subject: copy.mentorSubject,
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

const ensureMeetingLink = async (
  supabase: ReturnType<typeof createClient>,
  booking: any,
) => {
  const current = String(booking?.meeting_link || "").trim();
  if (current) return current;

  if (booking?.session_type !== "oneOnOneSession") return "";

  const roomId = `matepeak-${String(booking.id || "").replace(/[^a-zA-Z0-9-]/g, "")}`;
  const fallbackLink = `https://meet.jit.si/${roomId}`;

  // Best effort persistence so dashboard/other notifications use same link.
  const { error } = await supabase
    .from("bookings")
    .update({
      meeting_link: fallbackLink,
      meeting_provider: booking?.meeting_provider || "jitsi",
      meeting_id: booking?.meeting_id || roomId,
    })
    .eq("id", booking.id);

  if (error) {
    console.warn("[payment-success-emails] Failed to persist fallback meeting link", {
      booking_id: booking?.id,
      error: error.message,
    });
  }

  return fallbackLink;
};

const resolveDigitalProductLink = (booking: any): string => {
  if (booking?.session_type !== "digitalProducts") return "";
  return String(booking?.digital_product_link || "").trim();
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
      .select("full_name, username, email")
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

    const studentEmailSource = studentProfile?.email
      ? "profiles"
      : booking.user_email
      ? "bookings"
      : studentEmailFromAuth
      ? "auth"
      : "missing";
    const mentorEmailSource = mentorExpert?.email
      ? "expert_profiles"
      : mentorProfile?.email
      ? "profiles"
      : mentorEmailFromAuth
      ? "auth"
      : "missing";

    const studentEmail =
      studentProfile?.email || booking.user_email || studentEmailFromAuth || "";
    const mentorEmail = mentorExpert?.email || mentorProfile?.email || mentorEmailFromAuth || "";

    console.info("[payment-success-emails] Resolved recipients", {
      booking_id,
      studentEmail: studentEmail || null,
      mentorEmail: mentorEmail || null,
      studentEmailSource,
      mentorEmailSource,
    });

    if (!mentorEmail) {
      console.warn("[payment-success-emails] mentor email missing", {
        booking_id,
        mentor_profile_id: booking.expert_id,
        mentorEmailSource,
      });
    }

    const date = formatDate(booking.scheduled_date);
    const time = booking.scheduled_time;
    const studentTimezone = booking.user_timezone || "IST";
    const mentorTimezone = booking.mentor_timezone || "IST";
    const amount = Number(booking.total_amount || 0);
    const meetingLink = await ensureMeetingLink(supabase, booking);
    const digitalProductLink = resolveDigitalProductLink(booking);

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
      productLink: booking.digital_product_link,
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
      meetingLink,
      digitalProductLink,
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
