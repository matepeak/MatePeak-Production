# Review Request System Implementation

## Overview

This system automatically sends review request emails to students after their scheduled session end time has passed (scheduled start + booked duration). Students can then rate and review their mentors, which appears in both the mentor dashboard and public profile.

## Components Implemented

### 1. Database Migration (`supabase/migrations/20251230120000_add_review_request_system.sql`)

**New Columns:**

- `bookings.review_requested_at` - Timestamp when review email was sent
- `reviews.helpful_count` - Community feedback counter (future feature)
- `reviews.is_featured` - Flag for exceptional reviews

**New Functions:**

- `get_sessions_ready_for_review()` - Returns completed sessions ready for review requests
- `mark_review_requested(booking_id)` - Marks booking as email sent
- `get_mentor_rating_stats(mentor_id)` - Returns detailed rating breakdown

**Updated RLS Policies:**

- Students can create reviews for their completed bookings
- Anyone can view reviews
- Users can update their reviews within 30 days
- Users can delete their reviews within 7 days

### 2. Edge Function (`supabase/functions/send-review-requests/index.ts`)

**Functionality:**

- Runs on a cron schedule (recommended: every 15 minutes)
- Finds sessions whose scheduled end time has passed
- Checks if review request hasn't been sent
- Checks if student hasn't already reviewed
- Sends personalized email with review link
- Marks booking as `review_requested_at`

**Email Template:**
Beautiful gradient design with:

- Session details
- Star rating visualization
- Clear CTA button
- "Book Again" link

### 3. Review Submission Component (`src/components/reviews/ReviewSubmissionDialog.tsx`)

**Features:**

- Interactive 5-star rating selector
- Minimum 10-character review validation
- Session details display
- Character counter
- Prevents duplicate reviews
- Success feedback

### 4. Student Dashboard Integration (`src/components/dashboard/student/MySessions.tsx`)

**Features:**

- "Write Review" button on completed sessions
- Shows "Reviewed" badge if already submitted
- Tracks which sessions have reviews
- Opens review dialog on click

### 5. Mentor Dashboard (`src/components/dashboard/ReviewsManagement.tsx`)

**Features:**

- Average rating display
- Total reviews counter
- Rating distribution chart
- Filter by star rating
- Reply to reviews
- Export reviews to CSV
- Real-time updates

### 6. Public Profile (`src/components/profile/ProfileReviews.tsx`)

**Features:**

- Rating summary card
- Paginated review list
- Mentor replies display
- Student avatar and name
- Timestamp formatting
- Already correctly configured

## Setup Instructions

### Step 1: Run Database Migration

```bash
# Via Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor
# Copy and run: supabase/migrations/20251230120000_add_review_request_system.sql
```

### Step 2: Deploy Edge Function

```bash
# Deploy the send-review-requests function
supabase functions deploy send-review-requests

# Verify deployment
supabase functions list
```

### Step 3: Set Up Cron Job

**Option A: Supabase Cron (Recommended)**

In your Supabase Dashboard:

1. Go to Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL:

```sql
-- Schedule to run every 15 minutes
SELECT cron.schedule(
  'send-review-requests',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-review-requests',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

**Option B: External Cron Service**

Use services like:

- Cron-job.org
- EasyCron
- GitHub Actions

Schedule GET/POST to:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-review-requests`

### Step 4: Configure Environment Variables

Ensure these are set in Supabase Dashboard → Edge Functions → Configuration:

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
APP_URL=https://your-domain.com
```

### Step 5: Test the System

**Test Email Sending:**

```bash
# Invoke the function manually
supabase functions invoke send-review-requests
```

**Test Review Submission:**

1. Log in as a student
2. Go to Dashboard → Sessions
3. Find a completed session
4. Click "Write Review"
5. Submit rating and feedback
6. Verify it appears in mentor dashboard and public profile

## Flow Diagram

```
Session Completes
      ↓
Scheduled end time passed
      ↓
Cron Job Runs (every 15 min)
      ↓
Check: review_requested_at = null?
      ↓
Check: no existing review?
      ↓
Send Review Request Email
      ↓
Mark review_requested_at = NOW()
      ↓
Student Clicks Email Link → Dashboard
      ↓
Opens Review Dialog
      ↓
Submits Rating & Comment
      ↓
Saved to reviews table
      ↓
Appears in:
  - Mentor Dashboard (Reviews tab)
  - Mentor Public Profile (Reviews tab)
  - Updates average_rating in expert_profiles
```

## Database Schema

```sql
reviews (
  id UUID PRIMARY KEY
  booking_id UUID REFERENCES bookings(id)
  expert_id UUID REFERENCES expert_profiles(id)
  user_id UUID REFERENCES auth.users(id)
  rating INTEGER (1-5)
  comment TEXT
  mentor_reply TEXT (optional)
  replied_at TIMESTAMP
  created_at TIMESTAMP
  updated_at TIMESTAMP
  helpful_count INTEGER
  is_featured BOOLEAN
  UNIQUE(booking_id, user_id)
)

bookings (
  ...existing columns...
  review_requested_at TIMESTAMP
)
```

## Email Template Preview

**Subject:** How was your session with [Mentor Name]? ⭐

**Content:**

- Gradient purple header "Share Your Experience"
- Session details card (service, date, duration)
- "Your feedback matters!" highlight box
- 5 animated stars
- Large "Leave Your Review" button
- "Book another session" link
- Professional footer

## Testing Checklist

- [ ] Migration runs without errors
- [ ] Edge function deploys successfully
- [ ] Cron job triggers function
- [ ] Email sends to correct student
- [ ] Review link opens student dashboard
- [ ] Review dialog shows session details
- [ ] Rating validation works (1-5 stars required)
- [ ] Comment validation works (min 10 chars)
- [ ] Duplicate review prevention works
- [ ] Review appears in mentor dashboard
- [ ] Review appears in public profile
- [ ] Mentor can reply to review
- [ ] Average rating updates correctly
- [ ] "Write Review" button shows on completed sessions
- [ ] "Reviewed" badge shows after submission

## Troubleshooting

**Issue: Emails not sending**

- Check RESEND_API_KEY is valid
- Check function logs: `supabase functions logs send-review-requests`
- Verify Resend sender domain is verified

**Issue: Cron not triggering**

- Check pg_cron is enabled
- Verify cron schedule syntax
- Check database logs

**Issue: Reviews not appearing**

- Check RLS policies are enabled
- Verify user authentication
- Check expert_id matches mentor profile

**Issue: Duplicate emails**

- Check review_requested_at is being set
- Verify function checks this field
- Review database function logic

## Monitoring

**Check Email Stats:**

```sql
SELECT
  COUNT(*) as total_sessions,
  COUNT(review_requested_at) as emails_sent,
  COUNT(r.id) as reviews_submitted
FROM bookings b
LEFT JOIN reviews r ON r.booking_id = b.id
WHERE b.status = 'completed';
```

**Check Pending Reviews:**

```sql
SELECT * FROM get_sessions_ready_for_review();
```

**Check Mentor Ratings:**

```sql
SELECT * FROM get_mentor_rating_stats('mentor_uuid_here');
```

## Future Enhancements

1. **Helpful Review Voting** - Students can mark reviews as helpful
2. **Featured Reviews** - Automatically feature 5-star reviews
3. **Review Reminders** - Send follow-up if no review after 7 days
4. **Review Moderation** - Admin approval for flagged reviews
5. **Review Insights** - Analytics dashboard for mentors
6. **Photo Reviews** - Allow students to upload images
7. **Verified Reviews** - Badge for confirmed session attendees

## Support

For issues or questions:

- Check Supabase function logs
- Review database migration errors
- Test email templates in Resend dashboard
- Verify RLS policies with `SELECT` tests
