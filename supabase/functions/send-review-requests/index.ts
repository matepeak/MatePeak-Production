import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Deno URL imports are resolved at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://sparkmentorconnect.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const sessionTypeMap: Record<string, string> = {
  oneOnOneSession: "1:1 Mentoring Session",
  chatAdvice: "Chat Advice",
  priorityDm: "Priority DM",
  digitalProducts: "Digital Product",
  notes: "Session Notes",
};

const getServiceDisplayName = (sessionType?: string) => {
  if (!sessionType) return "Session";
  return sessionTypeMap[sessionType] || sessionType;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error occurred";
};

const buildReviewRequestEmail = (data: {
  studentName: string;
  mentorName: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  reviewLink: string;
  bookAgainLink: string;
}) => {
  const subject = `How was your session with ${data.mentorName}?`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; }
    .container { width: 100%; background-color: #e9ebed; padding: 48px 16px; }
    .inner-container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; background: #ffffff; margin-bottom: 28px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; color: #111; }
    .subtitle { font-size: 14px; color: #555; margin-top: 12px; line-height: 1.6; }
    .content { background: #ffffff; }
    .content p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .detail-row { font-size: 13px; color: #444; padding: 10px 0; border-bottom: 1px solid #e5e5e5; display: block; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #111; }
    .detail-value { color: #444; }
    .cta-wrap { text-align: center; margin: 36px 0; }
    .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .note { font-size: 13px; color: #666; text-align: center; line-height: 1.6; margin-bottom: 32px; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; background: #ffffff; }
    .link { color: #000; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
  <div class="inner-container">
    <div class="logo">MatePeak</div>
    <div class="header"><h1>Share Your Feedback</h1><div class="subtitle">Your session is complete and your feedback helps mentors improve.</div></div>
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>Your session with <strong>${data.mentorName}</strong> is complete. We'd love your feedback.</p>
      <div class="card">
        <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${data.serviceName}</span></div>
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${data.date}</span></div>
        <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${data.time}</span></div>
        <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${data.duration} minutes</span></div>
      </div>
      <div class="cta-wrap"><a class="button" href="${data.reviewLink}">Write a Review</a></div>
      <p class="note">Want another session? Book again from your dashboard: ${data.bookAgainLink}</p>
    </div>
    <div class="footer">Need help? <a href="mailto:support@matepeak.com" class="link">Contact Support</a></div>
  </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
};

// Helper to format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Helper to send email via Resend
const sendEmail = async (to: string, subject: string, html: string) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "MatePeak - Be a Solopreneur <support@matepeak.com>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Resend error: ${error.message}`);
  }

  return await res.json();
};

/**
 * Send Review Request Emails
 *
 * This function runs on a cron schedule (every 15 minutes recommended)
 * and sends review request emails to students after the scheduled session end
 * time has passed (scheduled start time + booked duration).
 *
 * Flow:
 * 1. Find completed sessions whose scheduled end time has passed
 * 2. Check if review request email hasn't been sent yet
 * 3. Check if student hasn't already left a review
 * 4. Send personalized review request email
 * 5. Mark booking as review_requested
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for sessions ready for review requests...");

    // Get sessions ready for review using our database function
    const { data: sessions, error } = await supabase.rpc(
      "get_sessions_ready_for_review"
    );

    if (error) {
      console.error("Error fetching sessions:", error);
      throw error;
    }

    console.log(`Found ${sessions?.length || 0} sessions ready for review`);

    let emailsSent = 0;
    const errors: any[] = [];

    // Send review request emails
    for (const session of sessions || []) {
      try {
        console.log(`Sending review request for booking ${session.booking_id}`);

        // Generate review link (goes to student dashboard with prompt)
        const reviewLink = `${APP_URL}/dashboard?action=review&booking=${session.booking_id}`;

        // Generate book again link (mentor profile)
        const bookAgainLink = `${APP_URL}/mentor/${session.mentor_id}`;

        // Prepare email data
        const emailData = {
          studentName: session.student_name,
          mentorName: session.mentor_name,
          serviceName: getServiceDisplayName(session.service_type),
          date: formatDate(session.scheduled_date),
          time: session.scheduled_time,
          duration: session.duration || 60,
          reviewLink,
          bookAgainLink,
        };

        const email = buildReviewRequestEmail(emailData);

        // Send email
        await sendEmail(session.student_email, email.subject, email.html);

        // Mark as requested in database
        await supabase.rpc("mark_review_requested", {
          p_booking_id: session.booking_id,
        });

        emailsSent++;
        console.log(`Review request sent to ${session.student_email}`);
      } catch (emailError: unknown) {
        console.error(
          `Error sending review request for booking ${session.booking_id}:`,
          emailError
        );
        errors.push({
          bookingId: session.booking_id,
          error: getErrorMessage(emailError),
        });
      }
    }

    const response = {
      success: true,
      message: `Review request emails processed`,
      stats: {
        totalFound: sessions?.length || 0,
        emailsSent,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Summary:", response.stats);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Fatal error in send-review-requests:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
