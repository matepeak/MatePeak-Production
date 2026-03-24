# Razorpay Payout Webhook Setup

This project now includes a webhook handler at:

- `supabase/functions/razorpay-payout-webhook/index.ts`

It verifies `x-razorpay-signature` with `RAZORPAY_WEBHOOK_SECRET` and updates payout state in Supabase.

## 1) Configure required secrets

Run from workspace root:

```bash
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg RAZORPAYX_KEY_ID=your_razorpayx_key_id
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg RAZORPAYX_KEY_SECRET=your_razorpayx_key_secret
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg RAZORPAYX_ACCOUNT_NUMBER=your_razorpayx_source_account_number
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg PAYOUT_RECONCILE_SECRET=your_long_random_secret
```

Keep this secret identical to Razorpay Dashboard webhook secret.

## 2) Deploy function

```bash
npx supabase functions deploy razorpay-payout-webhook --project-ref hnevrdlcqhmsfubakljg
npx supabase functions deploy reconcile-mentor-payouts --project-ref hnevrdlcqhmsfubakljg
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

Also ensure in RazorpayX dashboard:

1. The source account number matches `RAZORPAYX_ACCOUNT_NUMBER`.
2. API keys used are RazorpayX-enabled and have payout permissions.
3. Fund account validations are enabled for your account if using bank verification flows.

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

## 6) Reconciliation setup (recommended)

Webhook delivery can occasionally be delayed or fail. Deploy and schedule `reconcile-mentor-payouts` to settle stuck `processing` payouts.

Manual run example:

```bash
curl -X POST "https://hnevrdlcqhmsfubakljg.supabase.co/functions/v1/reconcile-mentor-payouts" \
   -H "Content-Type: application/json" \
   -H "x-reconcile-secret: your_long_random_secret" \
   -d '{"limit": 50, "older_than_minutes": 2}'
```

Recommended schedule: every 5-10 minutes.

GitHub Actions option (already added in repo):

- Workflow: `.github/workflows/payout-reconcile.yml`
- Add repository secrets:
   - `SUPABASE_PROJECT_REF` (for example: `hnevrdlcqhmsfubakljg`)
   - `PAYOUT_RECONCILE_SECRET` (must match Supabase Edge Function secret)
- Frequency: every 10 minutes (can be adjusted in cron).

## 7) Troubleshooting

- `401 Invalid webhook signature`:
  - Secret mismatch between Razorpay and Supabase.
- `handled: false, reason: No matching payout row`:
  - Event arrived before payout row was updated with provider id, or `reference_id` did not match payout UUID.
- `500` from RPC:
  - Verify migration `20260319003000_mentor_payout_wallet_system.sql` applied and RPCs exist.
- Withdrawals remain open in admin panel:
   - Apply migration `20260322113000_unify_admin_withdrawal_settlement.sql`.
- Verification works but payouts queue as manual:
   - Verify `RAZORPAYX_ACCOUNT_NUMBER`, `RAZORPAYX_KEY_ID`, `RAZORPAYX_KEY_SECRET` are set for functions.
