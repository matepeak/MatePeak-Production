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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 28px 14px; background-color: #f9fafb; color: #111827; }
    .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
    .header { background-color: #ffffff; color: #111827; padding: 30px 32px 12px; text-align: left; }
    .header h1 { margin: 0; font-size: 28px; line-height: 1.25; }
    .subtitle { margin-top: 10px; color: #4b5563; font-size: 15px; }
    .content { padding: 12px 32px 30px; }
    .card { background-color: #ffffff; border: 2px solid #111827; border-radius: 14px; padding: 18px 18px 10px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6b7280; font-weight: 600; }
    .detail-value { color: #111827; font-weight: 700; text-align: right; }
    .cta-wrap { text-align: center; margin-top: 22px; }
    .button { display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; }
    .note { margin-top: 14px; color: #4b5563; font-size: 14px; text-align: center; }
    .footer { padding: 0 32px 26px; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
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
    <div class="footer">Thanks for learning with MatePeak.</div>
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
