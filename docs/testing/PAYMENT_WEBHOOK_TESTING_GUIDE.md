# Payment Webhook Testing Guide

This guide validates the new Supabase Edge Function:

- `verify-payment`
- Path: `/functions/v1/verify-payment`
- Source: `supabase/functions/verify-payment/index.ts`

It covers:

1. Authentication checks
2. Payment success flow
3. Payment failure flow
4. Idempotency behavior
5. Email delivery to both mentee and mentor

## Prerequisites

- A deployed Supabase function named `verify-payment`
- At least one booking row exists in `bookings` with:
  - valid `id`
  - valid `user_id`
  - valid `expert_id`
  - valid student profile email
  - valid mentor profile email
- Supabase secrets configured:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `PAYMENT_WEBHOOK_SECRET` (recommended)
  - Optional Razorpay secrets:
    - `RAZORPAY_WEBHOOK_SECRET`
    - `RAZORPAY_KEY_SECRET`

## Test Data Setup

Use SQL editor to prepare one pending booking for testing:

```sql
-- Replace with valid IDs from your project
update bookings
set
  status = 'pending',
  payment_status = 'pending',
  payment_id = null
where id = 'YOUR_BOOKING_ID';
```

## Endpoint

Replace placeholders before testing:

- `PROJECT_REF` = your Supabase project reference
- `PAYMENT_WEBHOOK_SECRET` = value in Supabase secrets
- `BOOKING_ID` = booking UUID in database

Function URL:

`https://PROJECT_REF.supabase.co/functions/v1/verify-payment`

## 1. Authentication Negative Test (Must Fail)

Send request without any auth header.

PowerShell:

```powershell
$body = @{
  booking_id = "BOOKING_ID"
  status = "success"
  payment_id = "pay_auth_fail_test"
} | ConvertTo-Json

Invoke-RestMethod \
  -Method Post \
  -Uri "https://PROJECT_REF.supabase.co/functions/v1/verify-payment" \
  -ContentType "application/json" \
  -Body $body
```

Expected:

- HTTP 401
- Response contains `Webhook authentication failed`

## 2. Success Flow Test (Shared Secret)

PowerShell:

```powershell
$body = @{
  booking_id = "BOOKING_ID"
  status = "success"
  payment_id = "pay_success_001"
  order_id = "order_success_001"
} | ConvertTo-Json

Invoke-RestMethod \
  -Method Post \
  -Uri "https://PROJECT_REF.supabase.co/functions/v1/verify-payment" \
  -Headers @{ "x-payment-webhook-secret" = "PAYMENT_WEBHOOK_SECRET" } \
  -ContentType "application/json" \
  -Body $body
```

Expected API response:

- HTTP 200
- `success: true`
- `event_status: success`
- `booking_status: confirmed`
- `payment_status: completed` or `paid` (schema fallback)

Expected DB state:

```sql
select id, status, payment_status, payment_id
from bookings
where id = 'BOOKING_ID';
```

Expected row:

- `status = confirmed`
- `payment_status = completed` (or `paid` in fallback mode)
- `payment_id = pay_success_001`

Expected email behavior:

- Student receives booking confirmation email
- Mentor receives new booking confirmation email

## 3. Failure Flow Test (Shared Secret)

Reset row first:

```sql
update bookings
set
  status = 'pending',
  payment_status = 'pending',
  payment_id = null
where id = 'BOOKING_ID';
```

Send failed payment event:

```powershell
$body = @{
  booking_id = "BOOKING_ID"
  status = "failed"
  payment_id = "pay_failed_001"
  order_id = "order_failed_001"
} | ConvertTo-Json

Invoke-RestMethod \
  -Method Post \
  -Uri "https://PROJECT_REF.supabase.co/functions/v1/verify-payment" \
  -Headers @{ "x-payment-webhook-secret" = "PAYMENT_WEBHOOK_SECRET" } \
  -ContentType "application/json" \
  -Body $body
```

Expected API response:

- HTTP 200
- `success: true`
- `event_status: failed`
- `booking_status: cancelled`
- `payment_status: failed` or `pending` (schema fallback)

Expected DB state:

- `status = cancelled`
- `payment_status = failed` (or `pending` in fallback mode)
- `payment_id = pay_failed_001`

Expected email behavior:

- Student receives payment failed email
- Mentor receives booking payment failed email

## 4. Idempotency Test (Success Replayed)

Send the same success payload again after successful run.

Expected:

- HTTP 200
- `idempotent: true`
- No harmful state regression

## 5. Guardrail Test (Failure After Success)

1. Execute success flow
2. Send failure payload for same booking

Expected:

- API returns success with idempotent-style guard message
- Booking remains in successful state
- No downgrade to failed/cancelled

## 6. Razorpay Event-Style Payload Test

Use Razorpay-like payload where booking ID is inside notes.

```powershell
$body = @'
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_rzp_001",
        "status": "captured",
        "order_id": "order_rzp_001",
        "notes": {
          "actualBookingId": "BOOKING_ID"
        }
      }
    }
  }
}
'@

Invoke-RestMethod \
  -Method Post \
  -Uri "https://PROJECT_REF.supabase.co/functions/v1/verify-payment" \
  -Headers @{ "x-payment-webhook-secret" = "PAYMENT_WEBHOOK_SECRET" } \
  -ContentType "application/json" \
  -Body $body
```

Expected:

- Booking extracted from `payload.payment.entity.notes.actualBookingId`
- Same success behavior as standard success flow

## 7. Post-Test Verification Checklist

- [ ] Unauthorized requests are rejected
- [ ] Success webhook confirms booking and marks payment successful
- [ ] Failure webhook cancels booking and marks payment failed/fallback
- [ ] Replay requests do not break final state
- [ ] Failure after success does not downgrade state
- [ ] Student receives success/failure email
- [ ] Mentor receives success/failure email

## 8. Common Issues

1. HTTP 401 authentication failed
- Check `x-payment-webhook-secret`
- Confirm secret value exactly matches Supabase secret `PAYMENT_WEBHOOK_SECRET`

2. HTTP 404 booking not found
- Ensure payload carries real booking UUID
- Ensure booking UUID is in `booking_id` or nested Razorpay notes

3. Email not delivered
- Validate `RESEND_API_KEY`
- Verify student and mentor email fields exist
- Check function logs for Resend API errors

4. payment_status not set to `failed`
- This can be expected in fallback mode if schema only allows `pending/paid/refunded`
- Function intentionally falls back to maintain compatibility

## 9. Recommended Production Validation

- Configure gateway webhook to call `verify-payment`
- Run one live low-value payment
- Confirm:
  - database state update
  - both emails delivered
  - webhook retries remain safe
