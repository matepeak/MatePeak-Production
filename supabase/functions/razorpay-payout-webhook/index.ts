import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const textToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const constantTimeEquals = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
};

const signPayload = async (payload: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return textToHex(signature);
};

type RazorpayEvent = {
  event?: string;
  payload?: {
    payout?: {
      entity?: {
        id?: string;
        status?: string;
        reference_id?: string;
        status_details?: {
          description?: string;
          reason?: string;
        };
      };
    };
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey || !webhookSecret) {
    return json(500, { success: false, error: "Webhook is missing required secrets" });
  }

  const incomingSignature = req.headers.get("x-razorpay-signature") ?? "";
  if (!incomingSignature) {
    return json(401, { success: false, error: "Missing x-razorpay-signature" });
  }

  const bodyText = await req.text();
  const expectedSignature = await signPayload(bodyText, webhookSecret);
  if (!constantTimeEquals(expectedSignature, incomingSignature)) {
    return json(401, { success: false, error: "Invalid webhook signature" });
  }

  let payload: RazorpayEvent;
  try {
    payload = JSON.parse(bodyText) as RazorpayEvent;
  } catch {
    return json(400, { success: false, error: "Invalid JSON body" });
  }

  const eventName = String(payload.event || "").toLowerCase();
  const payoutEntity = payload.payload?.payout?.entity;
  const providerPayoutId = String(payoutEntity?.id || "").trim();
  const referenceId = String(payoutEntity?.reference_id || "").trim();
  const providerStatus = String(payoutEntity?.status || "").toLowerCase();

  if (!eventName || !providerPayoutId) {
    return json(200, {
      success: true,
      handled: false,
      reason: "Missing event or payout id",
    });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  let payoutRow: { id: string } | null = null;

  const byProviderId = await serviceClient
    .from("mentor_payouts")
    .select("id")
    .eq("provider", "razorpay")
    .eq("provider_payout_id", providerPayoutId)
    .maybeSingle();

  if (byProviderId.data?.id) {
    payoutRow = { id: String(byProviderId.data.id) };
  }

  if (!payoutRow && referenceId) {
    const byReferenceId = await serviceClient
      .from("mentor_payouts")
      .select("id")
      .eq("provider", "razorpay")
      .eq("id", referenceId)
      .maybeSingle();

    if (byReferenceId.data?.id) {
      payoutRow = { id: String(byReferenceId.data.id) };
    }
  }

  if (!payoutRow) {
    return json(200, {
      success: true,
      handled: false,
      reason: "No matching payout row",
      event: eventName,
      provider_payout_id: providerPayoutId,
      reference_id: referenceId || null,
    });
  }

  const successEvents = new Set(["payout.processed", "payout.completed"]);
  const failedEvents = new Set(["payout.failed", "payout.rejected", "payout.cancelled", "payout.canceled", "payout.reversed"]);
  const processingEvents = new Set(["payout.created", "payout.pending", "payout.queued", "payout.initiated", "payout.processing", "payout.updated"]);

  const failureReason =
    payoutEntity?.status_details?.description ||
    payoutEntity?.status_details?.reason ||
    `Razorpay event ${eventName}`;

  if (successEvents.has(eventName) || ["processed", "completed", "success"].includes(providerStatus)) {
    const { data, error } = await serviceClient.rpc("mark_mentor_payout_success", {
      p_payout_id: payoutRow.id,
      p_provider_payout_id: providerPayoutId,
      p_provider_response: payload,
    });

    if (error) {
      return json(500, {
        success: false,
        error: error.message,
        event: eventName,
        payout_id: payoutRow.id,
      });
    }

    return json(200, {
      success: true,
      handled: true,
      action: "mark_mentor_payout_success",
      payout_id: payoutRow.id,
      provider_payout_id: providerPayoutId,
      result: data,
    });
  }

  if (failedEvents.has(eventName) || ["failed", "rejected", "cancelled", "canceled", "reversed"].includes(providerStatus)) {
    const { data, error } = await serviceClient.rpc("mark_mentor_payout_failed", {
      p_payout_id: payoutRow.id,
      p_failure_reason: failureReason,
      p_provider_response: payload,
    });

    if (error) {
      return json(500, {
        success: false,
        error: error.message,
        event: eventName,
        payout_id: payoutRow.id,
      });
    }

    return json(200, {
      success: true,
      handled: true,
      action: "mark_mentor_payout_failed",
      payout_id: payoutRow.id,
      provider_payout_id: providerPayoutId,
      result: data,
    });
  }

  if (processingEvents.has(eventName) || ["pending", "queued", "processing"].includes(providerStatus)) {
    const { error } = await serviceClient
      .from("mentor_payouts")
      .update({
        status: "processing",
        provider_payout_id: providerPayoutId,
        provider_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoutRow.id);

    if (error) {
      return json(500, {
        success: false,
        error: error.message,
        event: eventName,
        payout_id: payoutRow.id,
      });
    }

    return json(200, {
      success: true,
      handled: true,
      action: "mark_processing",
      payout_id: payoutRow.id,
      provider_payout_id: providerPayoutId,
    });
  }

  return json(200, {
    success: true,
    handled: false,
    reason: "Event type ignored",
    event: eventName,
    payout_id: payoutRow.id,
    provider_payout_id: providerPayoutId,
  });
});
