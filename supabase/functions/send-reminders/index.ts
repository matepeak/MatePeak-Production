// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Booking {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  session_type: string;
  student_name: string;
  student_email: string;
  user_email: string;
  meeting_link: string;
  meeting_provider: string;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  expert_profiles: {
    full_name: string;
    email: string;
  };
}

serve(async (req) => {
  try {
    // Create Supabase client with service role key (has admin access)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in30Mins = new Date(now.getTime() + 30 * 60 * 1000); // Buffer for 1h reminder

    console.log("Checking for reminders at:", now.toISOString());

    // Query bookings that need reminders
    const { data: bookings, error: queryError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        scheduled_date,
        scheduled_time,
        duration,
        session_type,
        student_name,
        student_email,
        user_email,
        meeting_link,
        meeting_provider,
        reminder_24h_sent,
        reminder_1h_sent,
        expert_profiles!bookings_expert_id_fkey (
          full_name,
          email
        )
      `
      )
      .eq("status", "confirmed")
      .or(`reminder_24h_sent.eq.false,reminder_1h_sent.eq.false`);

    if (queryError) {
      console.error("Query error:", queryError);
      throw queryError;
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No bookings need reminders" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let sent24h = 0;
    let sent1h = 0;

    for (const booking of bookings as unknown as Booking[]) {
      const sessionDateTime = new Date(
        `${booking.scheduled_date}T${booking.scheduled_time}`
      );

      // Check if session is in the past (skip reminders)
      if (sessionDateTime < now) {
        continue;
      }

      // Format date for emails
      const formattedDate = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(sessionDateTime);

      const mentorName = booking.expert_profiles?.full_name || "your mentor";
      const studentEmail = booking.user_email || booking.student_email;
      const mentorEmail = booking.expert_profiles?.email;
      const meetingLink = booking.meeting_link || "";
      const hasMeetingLink = meetingLink.length > 0;

      // Send 24-hour reminder
      if (
        !booking.reminder_24h_sent &&
        sessionDateTime <= in24Hours &&
        sessionDateTime > in1Hour
      ) {
        console.log(`Sending 24h reminder for booking ${booking.id}`);

        // Email to student
        if (studentEmail) {
          await sendReminderEmail(
            studentEmail,
            booking.student_name || "there",
            mentorName,
            booking.session_type || "Session",
            formattedDate,
            booking.scheduled_time,
            "24 hours",
            meetingLink,
            hasMeetingLink
          );
        }

        // Email to mentor
        if (mentorEmail) {
          await sendReminderEmail(
            mentorEmail,
            mentorName,
            booking.student_name || "Student",
            booking.session_type || "Session",
            formattedDate,
            booking.scheduled_time,
            "24 hours",
            meetingLink,
            hasMeetingLink,
            true
          );
        }

        // Mark as sent
        await supabase
          .from("bookings")
          .update({ reminder_24h_sent: true })
          .eq("id", booking.id);

        sent24h++;
      }

      // Send 1-hour reminder
      if (
        !booking.reminder_1h_sent &&
        sessionDateTime <= in1Hour &&
        sessionDateTime > in30Mins
      ) {
        console.log(`Sending 1h reminder for booking ${booking.id}`);

        // Email to student
        if (studentEmail) {
          await sendReminderEmail(
            studentEmail,
            booking.student_name || "there",
            mentorName,
            booking.session_type || "Session",
            formattedDate,
            booking.scheduled_time,
            "1 hour",
            meetingLink,
            hasMeetingLink
          );
        }

        // Email to mentor
        if (mentorEmail) {
          await sendReminderEmail(
            mentorEmail,
            mentorName,
            booking.student_name || "Student",
            booking.session_type || "Session",
            formattedDate,
            booking.scheduled_time,
            "1 hour",
            meetingLink,
            hasMeetingLink,
            true
          );
        }

        // Mark as sent
        await supabase
          .from("bookings")
          .update({ reminder_1h_sent: true })
          .eq("id", booking.id);

        sent1h++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sent24h} 24-hour reminders and ${sent1h} 1-hour reminders`,
        sent24h,
        sent1h,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function sendReminderEmail(
  to: string,
  recipientName: string,
  otherPartyName: string,
  sessionType: string,
  date: string,
  time: string,
  timeUntil: string,
  meetingLink: string,
  hasMeetingLink: boolean,
  isMentor: boolean = false
) {
  const subject = `Reminder: ${sessionType} ${
    isMentor ? "with" : "from"
  } ${otherPartyName} in ${timeUntil}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #f59e0b; color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #f59e0b; }
    .meeting-button { display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .meeting-box { background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Session Reminder</h1>
    </div>
    
    <div class="content">
      <p>Hi ${recipientName},</p>
      <p><strong>This is a reminder that your session is coming up in ${timeUntil}!</strong></p>
      
      <div class="card">
        <h2 style="color: #92400e; font-size: 18px; margin-top: 0;">📅 Session Details</h2>
        <p style="margin: 8px 0;"><strong>${
          isMentor ? "Student" : "Mentor"
        }:</strong> ${otherPartyName}</p>
        <p style="margin: 8px 0;"><strong>Session:</strong> ${sessionType}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 8px 0;"><strong>Time:</strong> ${time}</p>
      </div>
      
      ${
        hasMeetingLink
          ? `
      <div class="meeting-box">
        <h3 style="color: #111827; margin-top: 0;">🎥 Ready to Join?</h3>
        <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">Click the button below to join your video session</p>
        <a href="${meetingLink}" class="meeting-button">${
              isMentor ? "Start" : "Join"
            } Meeting</a>
      </div>
      `
          : ""
      }
      
      <p style="color: #6b7280; font-size: 14px;">
        <strong>${isMentor ? "Mentor" : "Student"} Tips:</strong><br>
        ${
          isMentor
            ? "• Review any preparation materials<br>• Test your audio and video<br>• Have a quiet, well-lit space ready"
            : "• Prepare any questions you want to ask<br>• Test your audio and video<br>• Find a quiet place for the session"
        }
      </p>
    </div>
    
    <div class="footer">
      <p>Need to reschedule? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "MatePeak - Be a Solopreneur <support@matepeak.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to send reminder to ${to}:`, error);
    throw new Error(`Failed to send reminder email: ${error}`);
  }

  const data = await response.json();
  console.log(`Reminder sent to ${to}:`, data.id);
  return data;
}
