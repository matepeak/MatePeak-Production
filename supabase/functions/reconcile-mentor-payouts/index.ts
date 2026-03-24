// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-reconcile-secret",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const reconcileSecret = Deno.env.get("PAYOUT_RECONCILE_SECRET") ?? "";

const razorpayxKeyId = Deno.env.get("RAZORPAYX_KEY_ID") ?? Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const razorpayxKeySecret = Deno.env.get("RAZORPAYX_KEY_SECRET") ?? Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toFailureReason = (payload: any): string =>
  payload?.status_details?.description || payload?.status_details?.reason || payload?.error?.description || "Payout failed";

const fetchRazorpayPayout = async (providerPayoutId: string) => {
  const auth = btoa(`${razorpayxKeyId}:${razorpayxKeySecret}`);
  const response = await fetch(`https://api.razorpay.com/v1/payouts/${providerPayoutId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error?.description || payload?.message || `Failed to fetch payout status for ${providerPayoutId}`,
    );
  }

  return payload;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, { success: false, error: "Missing Supabase configuration" });
  }

  if (!razorpayxKeyId || !razorpayxKeySecret) {
    return json(500, { success: false, error: "Missing RazorpayX API credentials" });
  }

  if (reconcileSecret) {
    const incoming = req.headers.get("x-reconcile-secret") ?? "";
    if (incoming !== reconcileSecret) {
      return json(401, { success: false, error: "Unauthorized reconcile request" });
    }
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(body?.limit ?? 50), 200));
  const olderThanMinutes = Math.max(0, Math.min(Number(body?.older_than_minutes ?? 2), 120));

  const now = new Date();
  const threshold = new Date(now.getTime() - olderThanMinutes * 60 * 1000).toISOString();

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: pendingPayouts, error: pendingError } = await serviceClient
    .from("mentor_payouts")
    .select("id, provider_payout_id, status")
    .eq("provider", "razorpay")
    .eq("status", "processing")
    .not("provider_payout_id", "is", null)
    .lte("created_at", threshold)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pendingError) {
    return json(500, { success: false, error: pendingError.message });
  }

  const rows = pendingPayouts || [];

  let markedSuccess = 0;
  let markedFailed = 0;
  let stillProcessing = 0;
  let skipped = 0;
  const errors: Array<{ payout_id: string; error: string }> = [];

  for (const row of rows) {
    const payoutId = String(row.id || "");
    const providerPayoutId = String(row.provider_payout_id || "");

    if (!providerPayoutId) {
      skipped += 1;
      continue;
    }

    try {
      const providerPayload = await fetchRazorpayPayout(providerPayoutId);
      const providerStatus = String(providerPayload?.status || "").toLowerCase();

      if (["processed", "completed", "success"].includes(providerStatus)) {
        const { error } = await serviceClient.rpc("mark_mentor_payout_success", {
          p_payout_id: payoutId,
          p_provider_payout_id: providerPayoutId,
          p_provider_response: providerPayload,
        });

        if (error) {
          throw new Error(error.message);
        }

        markedSuccess += 1;
        continue;
      }

      if (["failed", "rejected", "cancelled", "canceled", "reversed"].includes(providerStatus)) {
        const { error } = await serviceClient.rpc("mark_mentor_payout_failed", {
          p_payout_id: payoutId,
          p_failure_reason: toFailureReason(providerPayload),
          p_provider_response: providerPayload,
        });

        if (error) {
          throw new Error(error.message);
        }

        markedFailed += 1;
        continue;
      }

      const { error: updateError } = await serviceClient
        .from("mentor_payouts")
        .update({
          status: "processing",
          provider_response: providerPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      stillProcessing += 1;
    } catch (error) {
      errors.push({
        payout_id: payoutId,
        error: error instanceof Error ? error.message : "Unknown reconcile error",
      });
    }
  }

  return json(200, {
    success: true,
    scanned: rows.length,
    marked_success: markedSuccess,
    marked_failed: markedFailed,
    still_processing: stillProcessing,
    skipped,
    errors,
  });
});
