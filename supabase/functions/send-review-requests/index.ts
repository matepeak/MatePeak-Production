import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://sparkmentorconnect.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Email template for review requests (inlined for dashboard deployment)
const reviewRequestEmailTemplate = (data: any) => ({
  subject: `How was your session with ${data.mentorName}? ⭐`,
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .stars { font-size: 32px; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    .highlight { background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⭐ Share Your Experience</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>We hope you had a valuable session with <strong>${data.mentorName}</strong>!</p>
      
      <div class="card">
        <p style="text-align: center; margin: 0;">
          <strong>Session Details</strong><br>
          ${data.serviceName}<br>
          ${data.date} • ${data.duration} minutes
        </p>
      </div>

      <div class="highlight">
        <p style="margin: 0; text-align: center;">
          <strong>Your feedback matters!</strong><br>
          Help other students find great mentors and help ${data.mentorName} grow their profile.
        </p>
      </div>
      
      <div class="stars" style="text-align: center;">⭐ ⭐ ⭐ ⭐ ⭐</div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.reviewLink}" class="button">Leave Your Review</a>
      </div>

      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 24px;">
        This will only take 2 minutes
      </p>

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
 * and sends review request emails to students 30 minutes after session completion.
 *
 * Flow:
 * 1. Find completed sessions that finished 30+ minutes ago
 * 2. Check if review request email hasn't been sent yet
 * 3. Check if student hasn't already left a review
 * 4. Send personalized review request email
 * 5. Mark booking as review_requested
 */
Deno.serve(async (req) => {
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
      } catch (emailError) {
        console.error(
          `Error sending review request for booking ${session.booking_id}:`,
          emailError
        );
        errors.push({
          bookingId: session.booking_id,
          error: emailError.message,
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
  } catch (error) {
    console.error("❌ Fatal error in send-review-requests:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
