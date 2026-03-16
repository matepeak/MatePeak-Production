// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error occurred";
};

const getErrorStack = (error: unknown) => {
  if (error instanceof Error) {
    return error.stack;
  }

  return undefined;
};

console.info("send-email function started");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    console.log("Received request:", {
      to: requestBody.to,
      subject: requestBody.subject,
    });

    const {
      to,
      subject,
      html,
      from = "MatePeak <support@matepeak.com>",
    }: EmailRequest = requestBody;

    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, or html");
    }

    // Check API key
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    console.log("Sending email to:", to);

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      console.error("Status code:", res.status);
      console.error("Full error:", JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || "Failed to send email",
          details: data,
          statusCode: res.status,
        }),
        {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Email sent successfully:", data.id);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: getErrorMessage(error),
        stack: getErrorStack(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
