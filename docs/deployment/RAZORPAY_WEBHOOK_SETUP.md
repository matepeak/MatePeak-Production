# Razorpay Payout Webhook Setup

This project now includes a webhook handler at:

- `supabase/functions/razorpay-payout-webhook/index.ts`

It verifies `x-razorpay-signature` with `RAZORPAY_WEBHOOK_SECRET` and updates payout state in Supabase.

## 1) Configure required secrets

Run from workspace root:

```bash
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

Keep this secret identical to Razorpay Dashboard webhook secret.

## 2) Deploy function

```bash
npx supabase functions deploy razorpay-payout-webhook --project-ref hnevrdlcqhmsfubakljg
```

Endpoint URL after deploy:

- `https://hnevrdlcqhmsfubakljg.supabase.co/functions/v1/razorpay-payout-webhook`

## 3) Configure Razorpay webhook

In Razorpay Dashboard:

1. Go to `Settings -> Webhooks`.
2. Add webhook URL:
   - `https://hnevrdlcqhmsfubakljg.supabase.co/functions/v1/razorpay-payout-webhook`
3. Set the same webhook secret used in Supabase `RAZORPAY_WEBHOOK_SECRET`.
4. Subscribe to payout events at least:
   - `payout.processed`
   - `payout.failed`
   - `payout.rejected`
   - `payout.reversed`
   - Optional: `payout.pending`, `payout.queued`, `payout.initiated`, `payout.processing`

## 4) How event mapping works

- Success events/statuses call RPC: `mark_mentor_payout_success`
- Failure events/statuses call RPC: `mark_mentor_payout_failed`
- Pending/queued/processing events update `mentor_payouts.status = 'processing'`

Lookup strategy:

1. Match by `mentor_payouts.provider_payout_id`
2. Fallback match by `mentor_payouts.id = payout.reference_id`

## 5) Test quickly

1. Create payout request from mentor side.
2. Ensure `mentor_payouts.provider_payout_id` is populated.
3. Use Razorpay test webhook send event feature.
4. Confirm updates:
   - `mentor_payouts.status`
   - `withdrawal_requests.status`
   - `withdrawal_requests.transaction_id`

## 6) Troubleshooting

- `401 Invalid webhook signature`:
  - Secret mismatch between Razorpay and Supabase.
- `handled: false, reason: No matching payout row`:
  - Event arrived before payout row was updated with provider id, or `reference_id` did not match payout UUID.
- `500` from RPC:
  - Verify migration `20260319003000_mentor_payout_wallet_system.sql` applied and RPCs exist.
