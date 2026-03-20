// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

const getMinutesUntilSession = (
  scheduledDate: string,
  scheduledTime: string,
  now: Date
) => {
  const sessionDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  return (sessionDateTime.getTime() - now.getTime()) / (1000 * 60);
};

const buildSessionReminderEmail = (
  data: {
    recipientName: string;
    otherPersonName: string;
    date: string;
    time: string;
    timezone: string;
    duration: number;
    meetingLink: string;
    dashboardLink: string;
  },
  reminderHours: 24 | 1,
) => {
  const subject =
    reminderHours === 24
      ? `Reminder: Session with ${data.otherPersonName} tomorrow`
      : `Reminder: Session with ${data.otherPersonName} in 1 hour`;

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
    <div class="header">
      <h1>${reminderHours === 24 ? "Upcoming Session Reminder" : "Your Session Starts Soon"}</h1>
      <div class="subtitle">Keep this handy so you are ready on time.</div>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>This is your ${reminderHours}-hour reminder for your session with <strong>${data.otherPersonName}</strong>.</p>

      <div class="card">
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${data.date}</span></div>
        <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${data.time} (${data.timezone})</span></div>
        <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${data.duration} minutes</span></div>
      </div>

      <div class="cta-wrap"><a class="button" href="${data.meetingLink || data.dashboardLink}">${data.meetingLink ? "Join Meeting" : "Open Dashboard"}</a></div>
      <p class="note">You can always check full booking details from your dashboard.</p>
    </div>
    <div class="footer">Need help? Contact support@matepeak.com</div>
  </div>
</body>
</html>
  `;

  return { subject, html };
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

// This function runs on a cron schedule
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    let emailsSent = 0;

    const todayDate = now.toISOString().split("T")[0];
    const twoDaysFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get upcoming bookings that still need at least one reminder.
    const { data: bookingsToCheck, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        user:profiles!bookings_user_id_fkey(full_name, email),
        expert:expert_profiles(full_name, email, username)
      `
      )
      .eq("status", "confirmed")
      .eq("session_type", "oneOnOneSession")
      .gte("scheduled_date", todayDate)
      .lte("scheduled_date", twoDaysFromNow)
      .or("reminder_24h_sent.eq.false,reminder_1h_sent.eq.false");

    if (fetchError) {
      console.error("Error fetching bookings for reminders:", fetchError);
      throw fetchError;
    }

    let reminders24hSent = 0;
    let reminders1hSent = 0;

    for (const booking of bookingsToCheck || []) {
      try {
        const minutesUntilSession = getMinutesUntilSession(
          booking.scheduled_date,
          booking.scheduled_time,
          now
        );

        // 24-hour reminder window: between 23 and 24 hours before start.
        const shouldSend24h =
          !booking.reminder_24h_sent &&
          minutesUntilSession <= 24 * 60 &&
          minutesUntilSession > 23 * 60;

        // 1-hour reminder window: within the final hour before start.
        const shouldSend1h =
          !booking.reminder_1h_sent &&
          minutesUntilSession <= 60 &&
          minutesUntilSession > 0;

        if (!shouldSend24h && !shouldSend1h) {
          continue;
        }

        if (!booking.user?.email || !booking.expert?.email) {
          console.warn(`Skipping reminder for booking ${booking.id}: missing recipient email`);
          continue;
        }

        const reminderHours = shouldSend24h ? 24 : 1;

        const studentEmail = buildSessionReminderEmail(
          {
            recipientName: booking.user.full_name,
            otherPersonName: booking.expert.full_name,
            date: formatDate(booking.scheduled_date),
            time: booking.scheduled_time,
            timezone: booking.user_timezone || "IST",
            duration: booking.duration,
            meetingLink: booking.meeting_link,
            dashboardLink: `${supabaseUrl.replace(
              "supabase.co",
              "vercel.app"
            )}/dashboard`,
          },
          reminderHours
        );

        const mentorEmail = buildSessionReminderEmail(
          {
            recipientName: booking.expert.full_name,
            otherPersonName: booking.user.full_name,
            date: formatDate(booking.scheduled_date),
            time: booking.scheduled_time,
            timezone: booking.expert_timezone || "IST",
            duration: booking.duration,
            meetingLink: booking.meeting_link,
            dashboardLink: `${supabaseUrl.replace(
              "supabase.co",
              "vercel.app"
            )}/dashboard`,
          },
          reminderHours
        );

        await sendEmail(booking.user.email, studentEmail.subject, studentEmail.html);
        await sendEmail(booking.expert.email, mentorEmail.subject, mentorEmail.html);

        const updatePayload: Record<string, boolean> = {};
        if (shouldSend24h) {
          updatePayload.reminder_24h_sent = true;
          reminders24hSent += 1;
          console.log(`Sent 24h reminder for booking ${booking.id}`);
        }
        if (shouldSend1h) {
          updatePayload.reminder_1h_sent = true;
          reminders1hSent += 1;
          console.log(`Sent 1h reminder for booking ${booking.id}`);
        }

        await supabase.from("bookings").update(updatePayload).eq("id", booking.id);

        emailsSent += 2;
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        reminders24hSent,
        reminders1hSent,
        bookingsChecked: bookingsToCheck?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in scheduled email function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
