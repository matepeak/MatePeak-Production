// Follow this setup guide to integrate the Razorpay API:
// https://razorpay.com/docs/payments/server-integration/nodejs/getting-started/

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  amount: number
  currency?: string
  booking_id?: string 
  // For local development to avoid uploading secrets
  razorpay_key_id?: string
  razorpay_key_secret?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase Client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 1. Authenticate the User (Security check)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      amount, 
      currency = "INR", 
      booking_id,
      razorpay_key_id: req_key_id,
      razorpay_key_secret: req_key_secret 
    } = await req.json() as PaymentRequest;

    // Use keys from request (passed from frontend .env) OR from environment variables
    const final_key_id = req_key_id || Deno.env.get("RAZORPAY_KEY_ID");
    const final_key_secret = req_key_secret || Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!amount) {
      return new Response(
        JSON.stringify({ error: "Amount is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    if (!final_key_id || !final_key_secret) {
      console.error('Razorpay keys are missing');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Razorpay credentials not found. Ensure keys are in your local .env or set in Supabase secrets." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const auth = btoa(`${final_key_id}:${final_key_secret}`);
    
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency: currency,
        receipt: `receipt_${booking_id || Date.now()}`,
        notes: {
          user_id: user.id,
          booking_id: booking_id || ""
        }
      }),
    });

    const order = await response.json();

    if (!response.ok) {
      console.error('Razorpay Error Payload:', order);
      throw new Error(order.error?.description || "Failed to create Razorpay order");
    }

    // 2. (Optional) Link order to booking in your DB
    if (booking_id) {
      console.info(`Updating booking ${booking_id} with order ${order.id}`);
      // Commented out or handled gracefully since the column might not exist yet
      /*
      const { error: dbError } = await supabaseClient
        .from('bookings')
        .update({ 
          razorpay_order_id: order.id, 
          status: 'awaiting_payment' 
        })
        .eq('id', booking_id);

      if (dbError) {
        console.error('Database update error:', dbError);
      }
      */
    }

    return new Response(JSON.stringify({ 
      success: true, 
      order,
      razorpay_key: final_key_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
