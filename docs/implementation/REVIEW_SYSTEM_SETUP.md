# Quick Setup Guide - Review Request System

## Prerequisites

✅ Supabase project with CLI installed
✅ Resend API key configured
✅ Database migrations up to date

## 5-Minute Setup

### Step 1: Run Migration (2 min)

```powershell
# Navigate to project root
cd d:\Matepeak\Project\spark-mentor-connect-08475-37914-35681--84739

# Apply migration
supabase db push
```

Or in Supabase Dashboard SQL Editor, run:
`supabase/migrations/20251230120000_add_review_request_system.sql`

### Step 2: Deploy Edge Function (1 min)

```powershell
# Deploy function
supabase functions deploy send-review-requests

# Verify
supabase functions list
```

### Step 3: Set Up Cron Job (2 min)

**In Supabase Dashboard → SQL Editor:**

```sql
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule function to run every 15 minutes
SELECT cron.schedule(
  'send-review-requests-cron',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'YOUR_SUPABASE_URL/functions/v1/send-review-requests',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      )
    );
  $$
);
```

**Replace:**

- `YOUR_SUPABASE_URL` with your project URL
- `YOUR_SERVICE_ROLE_KEY` with your service role key (Dashboard → Settings → API)

### Step 4: Test Manually

```powershell
# Test the function
supabase functions invoke send-review-requests --no-verify-jwt

# Check logs
supabase functions logs send-review-requests
```

## Verification Checklist

✅ Migration runs without errors
✅ Edge function deploys successfully  
✅ Cron job is scheduled
✅ Test invocation returns success
✅ Review button appears on completed sessions
✅ Review dialog opens and submits successfully
✅ Reviews appear in mentor dashboard
✅ Reviews appear in public profile

## Quick Test

1. **Create a completed session** (manually update a booking):

```sql
UPDATE bookings
SET status = 'completed',
    updated_at = NOW() - INTERVAL '35 minutes'
WHERE id = 'YOUR_BOOKING_ID';
```

2. **Trigger function manually**:

```powershell
supabase functions invoke send-review-requests
```

3. **Check email was sent**:

```sql
SELECT review_requested_at FROM bookings WHERE id = 'YOUR_BOOKING_ID';
-- Should show a timestamp
```

4. **Submit review as student**:

- Log in as student
- Go to Dashboard → Sessions
- Click "Write Review" on completed session
- Submit 5-star review

5. **Verify review appears**:

- Check mentor dashboard → Reviews tab
- Check mentor public profile → Reviews tab

## Troubleshooting

**"Function not found"**

```powershell
supabase functions list
# Should show send-review-requests
```

**"No sessions found"**

- Ensure bookings have status='completed'
- Check updated_at is 30+ minutes ago
- Verify review_requested_at is NULL

**"Email not sending"**

- Check RESEND_API_KEY in Edge Function config
- Verify Resend domain is verified
- Check function logs for errors

**"Review not appearing"**

- Check browser console for errors
- Verify RLS policies allow SELECT on reviews
- Check expert_id matches mentor profile

## Cron Schedule Options

```sql
-- Every 15 minutes (Recommended)
'*/15 * * * *'

-- Every 30 minutes
'*/30 * * * *'

-- Every hour
'0 * * * *'

-- Every 5 minutes (for testing)
'*/5 * * * *'
```

## View Cron Jobs

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Delete a cron job
SELECT cron.unschedule('send-review-requests-cron');
```

## Monitor Performance

```sql
-- Check how many review requests sent today
SELECT COUNT(*)
FROM bookings
WHERE review_requested_at >= CURRENT_DATE;

-- Check conversion rate
SELECT
  COUNT(*) as emails_sent,
  COUNT(r.id) as reviews_received,
  ROUND(COUNT(r.id)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as conversion_rate
FROM bookings b
LEFT JOIN reviews r ON r.booking_id = b.id
WHERE b.review_requested_at IS NOT NULL;
```

## Next Steps

1. Monitor email delivery rates
2. Check review submission rate
3. Adjust cron frequency if needed
4. Add custom email template branding
5. Set up review analytics dashboard

## Support

Check logs:

```powershell
supabase functions logs send-review-requests --tail
```

View recent function invocations:

```sql
SELECT * FROM net.http_request_queue ORDER BY created_at DESC LIMIT 10;
```
