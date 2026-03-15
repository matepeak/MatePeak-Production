import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { emailTemplates } from "../_shared/email-templates.ts";

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
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

    let emailsSent = 0;

    // Get bookings 24 hours away that haven't received reminder
    const { data: bookings24h, error: error24h } = await supabase
      .from("bookings")
      .select(
        `
        *,
        user:profiles!bookings_user_id_fkey(full_name, email),
        expert:expert_profiles(full_name, email, username)
      `
      )
      .eq("status", "confirmed")
      .gte("scheduled_date", in24Hours.toISOString().split("T")[0])
      .lte(
        "scheduled_date",
        new Date(in24Hours.getTime() + 3600000).toISOString().split("T")[0]
      )
      .eq("reminder_24h_sent", false);

    if (error24h) {
      console.error("Error fetching 24h bookings:", error24h);
    }

    // Send 24h reminders
    for (const booking of bookings24h || []) {
      try {
        // Send to student
        const studentEmail = emailTemplates.sessionReminder(
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
          24
        );

        await sendEmail(
          booking.user.email,
          studentEmail.subject,
          studentEmail.html
        );

        // Send to mentor
        const mentorEmail = emailTemplates.sessionReminder(
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
          24
        );

        await sendEmail(
          booking.expert.email,
          mentorEmail.subject,
          mentorEmail.html
        );

        // Mark as sent
        await supabase
          .from("bookings")
          .update({ reminder_24h_sent: true })
          .eq("id", booking.id);

        emailsSent += 2;
        console.log(`Sent 24h reminder for booking ${booking.id}`);
      } catch (error) {
        console.error(
          `Failed to send 24h reminder for booking ${booking.id}:`,
          error
        );
      }
    }

    // Get bookings 1 hour away that haven't received reminder
    const { data: bookings1h, error: error1h } = await supabase
      .from("bookings")
      .select(
        `
        *,
        user:profiles!bookings_user_id_fkey(full_name, email),
        expert:expert_profiles(full_name, email, username)
      `
      )
      .eq("status", "confirmed")
      .gte("scheduled_date", in1Hour.toISOString().split("T")[0])
      .lte(
        "scheduled_date",
        new Date(in1Hour.getTime() + 3600000).toISOString().split("T")[0]
      )
      .eq("reminder_1h_sent", false);

    if (error1h) {
      console.error("Error fetching 1h bookings:", error1h);
    }

    // Send 1h reminders
    for (const booking of bookings1h || []) {
      try {
        // Send to student
        const studentEmail = emailTemplates.sessionReminder(
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
          1
        );

        await sendEmail(
          booking.user.email,
          studentEmail.subject,
          studentEmail.html
        );

        // Send to mentor
        const mentorEmail = emailTemplates.sessionReminder(
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
          1
        );

        await sendEmail(
          booking.expert.email,
          mentorEmail.subject,
          mentorEmail.html
        );

        // Mark as sent
        await supabase
          .from("bookings")
          .update({ reminder_1h_sent: true })
          .eq("id", booking.id);

        emailsSent += 2;
        console.log(`Sent 1h reminder for booking ${booking.id}`);
      } catch (error) {
        console.error(
          `Failed to send 1h reminder for booking ${booking.id}:`,
          error
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        bookings24h: bookings24h?.length || 0,
        bookings1h: bookings1h?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scheduled email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
