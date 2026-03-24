// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") || "MatePeak <support@matepeak.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CHECKPOINTS = [
  { key: "day_1", days: 1, subject: "Complete Phase 2 onboarding to get verified" },
  { key: "week_1", days: 7, subject: "Reminder: Phase 2 onboarding is pending" },
  { key: "month_1", days: 30, subject: "Your verification is still pending" },
  { key: "year_1", days: 365, subject: "Final reminder: complete mentor verification" },
];

const sendEmail = async (to: string, subject: string, html: string) => {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend failed (${response.status}): ${text}`);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars are missing");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();

    const { data: mentors, error: mentorError } = await supabase
      .from("expert_profiles")
      .select("id, user_id, created_at, verification_status, phase_2_complete, onboarding_version")
      .eq("onboarding_version", "v2")
      .eq("phase_1_complete", true)
      .neq("verification_status", "verified")
      .eq("phase_2_complete", false);

    if (mentorError) throw mentorError;

    const userIds = Array.from(
      new Set((mentors || []).map((mentor) => mentor.user_id).filter(Boolean))
    );

    const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      for (const profile of profiles || []) {
        profileMap.set(profile.id, {
          email: profile.email || null,
          full_name: profile.full_name || null,
        });
      }
    }

    let sent = 0;

    for (const mentor of mentors || []) {
      const createdAt = new Date(mentor.created_at);
      const elapsedDays = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const profile = profileMap.get(mentor.user_id);
      const email = profile?.email;
      const name = profile?.full_name || "Mentor";
      if (!email) continue;

      for (const checkpoint of CHECKPOINTS) {
        if (elapsedDays < checkpoint.days) continue;

        const { data: alreadySent } = await supabase
          .from("phase2_verification_reminder_logs")
          .select("id")
          .eq("mentor_id", mentor.id)
          .eq("checkpoint", checkpoint.key)
          .maybeSingle();

        if (alreadySent) continue;

        await sendEmail(
          email,
          checkpoint.subject,
          `<p>Hi ${name},</p><p>Your Phase 2 onboarding is still pending.</p><p>Complete it to unlock verified mentor status and higher booking limits.</p><p><a href="${Deno.env.get("PUBLIC_APP_URL") || "https://matepeak.com"}/expert/onboarding/phase-2">Complete Phase 2 onboarding</a></p>`
        );

        await supabase.from("phase2_verification_reminder_logs").insert({
          mentor_id: mentor.id,
          checkpoint: checkpoint.key,
        });

        sent += 1;
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: sent }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
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
