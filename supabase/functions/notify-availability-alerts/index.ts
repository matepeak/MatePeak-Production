// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const resendFrom =
  Deno.env.get("RESEND_FROM") || "MatePeak <support@matepeak.com>";
const appUrl = Deno.env.get("APP_URL") || "https://matepeak.com";
const brandIconLogoUrl = `${appUrl}/lovable-uploads/MatePeak_logo_with_name.png`;

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type SlotPayload = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string | null;
};

type AlertSubscription = {
  id: string;
  email: string;
  preferred_single_date: string | null;
  preferred_range_start: string | null;
  preferred_range_end: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
};

const toTimeLabel = (time: string) => time.slice(0, 5);

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const doesTimeOverlap = (
  slotStart: string,
  slotEnd: string,
  preferenceStart: string | null,
  preferenceEnd: string | null
) => {
  if (!preferenceStart && !preferenceEnd) return true;

  const normalizedSlotStart = toTimeLabel(slotStart);
  const normalizedSlotEnd = toTimeLabel(slotEnd);
  const normalizedPrefStart = preferenceStart
    ? toTimeLabel(preferenceStart)
    : null;
  const normalizedPrefEnd = preferenceEnd ? toTimeLabel(preferenceEnd) : null;

  if (normalizedPrefStart && normalizedSlotEnd <= normalizedPrefStart) {
    return false;
  }

  if (normalizedPrefEnd && normalizedSlotStart >= normalizedPrefEnd) {
    return false;
  }

  return true;
};

const matchesPreferences = (slot: SlotPayload, alert: AlertSubscription) => {
  const hasSingleDate = !!alert.preferred_single_date;
  const hasRange = !!alert.preferred_range_start && !!alert.preferred_range_end;

  if (!hasSingleDate && !hasRange) {
    return false;
  }

  if (!slot.specific_date) {
    return false;
  }

  if (hasSingleDate && slot.specific_date !== alert.preferred_single_date) {
    return false;
  }

  if (
    hasRange &&
    (slot.specific_date < alert.preferred_range_start! ||
      slot.specific_date > alert.preferred_range_end!)
  ) {
    return false;
  }

  return doesTimeOverlap(
    slot.start_time,
    slot.end_time,
    alert.preferred_time_start,
    alert.preferred_time_end
  );
};

const sortSlotsByDateTime = (slots: SlotPayload[]) =>
  [...slots].sort((a, b) => {
    const dateCompare = (a.specific_date || "").localeCompare(b.specific_date || "");
    if (dateCompare !== 0) return dateCompare;
    return a.start_time.localeCompare(b.start_time);
  });

const slotSummaryLabel = (slot: SlotPayload) => {
  const dayName = dayNames[slot.day_of_week] || "Unknown day";
  const timeRange = `${toTimeLabel(slot.start_time)} - ${toTimeLabel(
    slot.end_time
  )}`;

  if (slot.specific_date) {
    return `${formatDate(slot.specific_date)} • ${timeRange}`;
  }

  return `${dayName} (Recurring) • ${timeRange}`;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: resendFrom,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend failed: ${response.status} ${errorBody}`);
  }
};

const buildEmailHtml = (
  mentorName: string,
  matchingSlots: SlotPayload[],
  mentorPath: string,
  mentorLogoUrl: string | null
) => {
  const safeMentorName = escapeHtml(mentorName);
  const safeMentorPath = escapeHtml(`${appUrl}${mentorPath}`);
  const mentorInitials = escapeHtml(initialsFromName(mentorName));
  const mentorAvatarBlock = mentorLogoUrl
    ? `<img src="${escapeHtml(
        mentorLogoUrl
      )}" alt="${safeMentorName}" style="width:44px;height:44px;border-radius:9999px;object-fit:cover;" />`
    : `<div style="width:44px;height:44px;border-radius:9999px;background:#111827;color:#ffffff;display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;">${mentorInitials}</div>`;

  const slotItems = matchingSlots
    .slice(0, 8)
    .map(
      (slot) =>
        `<li style="margin-bottom:8px;color:#1f2937;">${escapeHtml(
          slotSummaryLabel(slot)
        )}</li>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
      .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
      .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
      .title { text-align: center; font-size: 24px; font-weight: 600; color: #111; margin-bottom: 28px; }
      .text { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
      .details-box { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
      .button-container { text-align: center; margin: 36px 0; }
      .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
      .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; }
      .link { color: #000; text-decoration: none; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="logo">MatePeak</div>
        <div class="title">Availability Alert</div>
        <div class="text" style="text-align:center;">${safeMentorName} added new slots that match your preferences.</div>

        <div class="details-box">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          ${mentorAvatarBlock}
          <div>
            <p style="margin:0;font-size:12px;color:#6e6e73;letter-spacing:0.2px;">Mentor update</p>
            <p style="margin:2px 0 0;font-size:15px;font-weight:600;color:#1d1d1f;">${safeMentorName}</p>
          </div>
        </div>

        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
          ${safeMentorName} just added availability that fits your selected date preferences.
        </p>

        <div style="background:#ffffff;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
          <ul style="margin:0;padding:0 0 0 18px;line-height:1.6;">
            ${slotItems}
          </ul>
        </div>

        <p style="margin:0;font-size:12px;line-height:1.5;color:#6e6e73;">
          You’re receiving this because you enabled availability alerts for this mentor.
        </p>
        </div>

        <div class="button-container">
          <a href="${safeMentorPath}" class="button">View Mentor Availability</a>
        </div>

        <div class="footer">
          Need help? <a href="mailto:support@matepeak.com" class="link">Contact Support</a>
        </div>
      </div>
    </div>
  </body>
</html>
`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authorization.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const mentorId = body?.mentorId as string;
    const slots = (Array.isArray(body?.slots) ? body.slots : []) as SlotPayload[];

    if (!mentorId || !slots.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No slots to process" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (user.id !== mentorId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: mentorProfile } = await supabase
      .from("expert_profiles")
      .select("full_name, username, profile_picture_url")
      .eq("id", mentorId)
      .maybeSingle();

    const mentorDisplayName =
      mentorProfile?.full_name || mentorProfile?.username || "Your mentor";
    const mentorPath = mentorProfile?.username
      ? `/mentor/${mentorProfile.username}`
      : `/mentors/${mentorId}`;
    const mentorLogoUrl = mentorProfile?.profile_picture_url || null;

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("availability_alerts")
      .select(
        "id, email, preferred_single_date, preferred_range_start, preferred_range_end, preferred_time_start, preferred_time_end"
      )
      .eq("mentor_id", mentorId)
      .eq("is_active", true);

    if (subscriptionError) {
      throw subscriptionError;
    }

    const recipients = new Map<string, SlotPayload[]>();

    for (const subscription of (subscriptions || []) as AlertSubscription[]) {
      const matchingSlots = slots.filter((slot) =>
        matchesPreferences(slot, subscription)
      );

      if (!matchingSlots.length) {
        continue;
      }

      const hasDateRangePreference =
        !!subscription.preferred_range_start && !!subscription.preferred_range_end;
      const hasTimeRangePreference =
        !!subscription.preferred_time_start && !!subscription.preferred_time_end;

      const selectedSlots =
        hasDateRangePreference && hasTimeRangePreference
          ? sortSlotsByDateTime(matchingSlots).slice(0, 1)
          : matchingSlots;

      const existing = recipients.get(subscription.email) || [];
      recipients.set(subscription.email, [...existing, ...selectedSlots]);
    }

    let sent = 0;
    for (const [email, matchingSlots] of recipients.entries()) {
      const emailSlots = sortSlotsByDateTime(matchingSlots).slice(0, 8);
      const subject = `New availability from ${mentorDisplayName}`;
      const html = buildEmailHtml(
        mentorDisplayName,
        emailSlots,
        mentorPath,
        mentorLogoUrl
      );
      await sendEmail(email, subject, html);
      sent += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionsChecked: subscriptions?.length || 0,
        recipientCount: recipients.size,
        emailsSent: sent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("notify-availability-alerts error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
