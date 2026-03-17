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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error occurred";
};

// Email template for review requests (inlined for dashboard deployment)
const reviewRequestEmailTemplate = (data: any) => ({
  subject: `How was your session with ${data.mentorName}?`,
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 28px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .stars { font-size: 28px; margin: 18px 0; letter-spacing: 2px; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    .subtext { color: #6b7280; font-size: 14px; text-align: center; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Your 60-second review helps other learners choose the right mentor.
    </div>
    <div class="header">
      <h1>How was your session?</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>Thanks for learning with <strong>${data.mentorName}</strong>.</p>
      
      <div class="card">
        <p style="text-align: center; margin: 0;">
          <strong>Session Details</strong><br>
          ${data.serviceName} with ${data.mentorName}<br>
          ${data.date} • ${data.duration} minutes
        </p>
      </div>
      
      <div class="stars" style="text-align: center;">⭐ ⭐ ⭐ ⭐ ⭐</div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.reviewLink}" class="button">Leave a Review</a>
      </div>

      <p class="subtext">Takes less than 1 minute: 1–5 stars + short comment.</p>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="text-align: center;">
          <strong>Enjoyed your session?</strong><br>
          <a href="${data.bookAgainLink}" style="color: #6366f1; text-decoration: none; font-weight: 600;">Book another session with ${data.mentorName} →</a>
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>Questions? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `,
});

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

    console.log("🔍 Checking for sessions ready for review requests...");

    // Get sessions ready for review using our database function
    const { data: sessions, error } = await supabase.rpc(
      "get_sessions_ready_for_review"
    );

    if (error) {
      console.error("Error fetching sessions:", error);
      throw error;
    }

    console.log(`📧 Found ${sessions?.length || 0} sessions ready for review`);

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
          serviceName: session.service_type,
          date: formatDate(session.scheduled_date),
          time: session.scheduled_time,
          duration: session.duration || 60,
          reviewLink,
          bookAgainLink,
        };

        // Generate email from template
        const email = reviewRequestEmailTemplate(emailData);

        // Send email
        await sendEmail(session.student_email, email.subject, email.html);

        // Mark as requested in database
        await supabase.rpc("mark_review_requested", {
          p_booking_id: session.booking_id,
        });

        emailsSent++;
        console.log(`✅ Review request sent to ${session.student_email}`);
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

    console.log("📊 Summary:", response.stats);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("❌ Fatal error in send-review-requests:", error);
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
