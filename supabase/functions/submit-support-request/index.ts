// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFrom = Deno.env.get("RESEND_FROM") || "MatePeak <support@matepeak.com>";
const supportEmail = "support@matepeak.com";

const escapeHtml = (value: string) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") || "",
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = await req.json();
    const name = String(payload?.name || "").trim();
    const email = String(payload?.email || "").trim();
    const topic = String(payload?.topic || "").trim();
    const subject = String(payload?.subject || "").trim();
    const message = String(payload?.message || "").trim();

    if (!name || !email || !topic || !subject || !message) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: requestRecord, error: insertError } = await serviceClient
      .from("support_requests")
      .insert({
        user_id: user.id,
        name,
        email,
        topic,
        subject,
        message,
        source: "student_support_page",
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      throw new Error(insertError.message || "Failed to store support request");
    }

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeTopic = escapeHtml(topic);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

    const emailSubject = `[Support] ${topic} - ${subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">New Support Request</h2>
        <p style="margin-top: 0; color: #444;">A new support request was submitted from MatePeak.</p>
        <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
        <p><strong>Request ID:</strong> ${escapeHtml(requestRecord.id)}</p>
        <p><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Topic:</strong> ${safeTopic}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong><br />${safeMessage}</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFrom,
        to: supportEmail,
        reply_to: email,
        subject: emailSubject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const resendBody = await resendResponse.text();
      throw new Error(`Failed to send support email (${resendResponse.status}): ${resendBody}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        requestId: requestRecord.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("submit-support-request error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error?.message || "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
