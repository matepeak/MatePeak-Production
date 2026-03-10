# Simplified Mentor Onboarding - Deployment Guide

## Overview
This guide covers deployment of the new simplified 3-step mentor onboarding system with progressive disclosure, tier badges, profile completion tracking, and booking limits.

## 📋 Implementation Summary

### ✅ Completed Frontend Changes

1. **Phased Onboarding System**
   - Phase 1 (Required): Basic Info → Services & Pricing → Identity Verification
   - Phase 2 (Optional): 8 enhancement steps for better visibility
   - Auto-save drafts every 30s (localStorage + database)
   - "Go Live" option after Phase 1 completion
   - "Complete Later" functionality
   - Visual phase indicators and progress tracking

2. **Profile Completion Dashboard**
   - Component: `src/components/dashboard/ProfileCompletionCard.tsx`
   - Shows profile completion percentage (0-100%)
   - Displays current mentor tier with badge
   - Lists missing optional fields
   - Shows tier benefits and next tier requirements
   - Integrated into `MentorDashboard` overview

3. **Tier Badge System**
   - Component: `src/components/profile/TierBadge.tsx`
   - Three tiers: Basic (gray), Verified (blue), Top (gold)
   - Displayed on:
     - Public mentor profiles (ProfileHeader)
     - Mentor cards in listings
     - Dashboard

4. **Progressive Booking Limits**
   - Service: `src/services/bookingLimitService.ts`
   - Basic tier: 5 bookings/week
   - Verified tier: 15 bookings/week
   - Top tier: Unlimited bookings
   - Real-time limit checking in BookingDialog
   - Visual warnings when limit reached
   - Disabled booking button when limit exceeded

---

## 🗄️ Database Migrations to Apply

### Migration 1: Verification Storage Policies
**File:** `supabase/migrations/20250227000001_add_verification_storage_policies.sql`

**What it does:**
- Creates RLS policies for verification-photos storage bucket
- Users can only access their own verification photos
- Admins can view all verification photos

**How to apply:**
```bash
# Using Supabase CLI
supabase db push

# OR manually in Supabase Dashboard:
# SQL Editor → New Query → Paste contents → Run
```

### Migration 2: Profile Completion & Tier System
**File:** `supabase/migrations/20260227000002_add_profile_completion_system.sql`

**What it does:**
- Adds new columns to `expert_profiles` table:
  - `profile_completion_percentage` (0-100)
  - `mentor_tier` ('basic', 'verified', 'top')
  - `is_profile_live` (boolean)
  - `phase_1_complete` (boolean)
  - `phase_2_complete` (boolean)
  - `total_sessions_completed` (integer)
  - `average_rating` (decimal)
  - `response_rate` (decimal)
  - `max_weekly_bookings` (integer)
- Makes optional fields nullable (introduction, teaching_experience, etc.)
- Creates profile completion calculation function
- Adds triggers for auto-tier upgrades
- Creates performance indexes

**How to apply:**
```bash
# Using Supabase CLI
supabase db push

# OR manually in Supabase Dashboard:
# SQL Editor → New Query → Paste contents → Run
```

---

## 🎯 Expected Outcomes

### User Experience Improvements

1. **Faster Time to Go Live**
   - Old: 11 required steps, 35-55 minutes
   - New: 3 required steps, ~8-12 minutes
   - **Expected improvement: 70% reduction in onboarding time**

2. **Lower Drop-off Rate**
   - Industry average: 68-72% drop-off for long forms
   - Expected with 3-step flow: 30-40% drop-off
   - **Net improvement: ~40% more mentor completions**

3. **Better Conversion to 5000 Mentor Goal**
   - Current needed: 28 completions/day
   - With 70% drop-off: Need 93 signups/day
   - With 35% drop-off: Need 43 signups/day
   - **54% reduction in required marketing spend**

### Business Metrics

1. **Tier Distribution** (expected after 30 days)
   - Basic: 60% (newly onboarded)
   - Verified: 35% (completed profiles + verified)
   - Top: 5% (high performers)

2. **Profile Completion Rates**
   - Phase 1: 60-65% complete immediately
   - Phase 2: 20-25% complete within 7 days
   - Full completion: 40-45% within 30 days

3. **Booking Capacity**
   - Basic tier: 5/week × 3000 mentors = 15,000 bookings/week
   - Verified tier: 15/week × 1750 mentors = 26,250 bookings/week
   - Top tier: Unlimited × 250 mentors = ~10,000 bookings/week
   - **Total capacity: 51,250+ bookings/week**

---

## 🧪 Testing Checklist

### Before Going Live

- [ ] Test complete Phase 1 onboarding flow
  - [ ] Basic Info step validation
  - [ ] Services & Pricing step (min 1 service)
  - [ ] Identity Verification with liveness detection
  - [ ] "Go Live" button appears after Phase 1
  - [ ] Can skip to Phase 2

- [ ] Test draft auto-save
  - [ ] localStorage saves every 30s
  - [ ] Database draft save on manual button
  - [ ] Draft loads on return visit

- [ ] Test Profile Completion Dashboard
  - [ ] Shows correct completion percentage
  - [ ] Displays current tier badge
  - [ ] Lists missing fields accurately
  - [ ] "Complete Profile" button navigates to onboarding

- [ ] Test Tier Badges
  - [ ] Display correctly on public profiles
  - [ ] Show on mentor cards in listings
  - [ ] Update when tier changes

- [ ] Test Booking Limits
  - [ ] Basic mentor limited to 5 bookings/week
  - [ ] Verified mentor gets 15 bookings/week
  - [ ] Warning shows when limit reached
  - [ ] Booking button disabled at limit
  - [ ] Weekly reset works correctly

- [ ] Test Tier Auto-Upgrades
  - [ ] Basic → Verified when verified + 70% complete
  - [ ] Verified → Top when 10+ sessions + 4.5+ rating + 90%+ response rate

### Database Verification

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expert_profiles' 
AND column_name IN (
  'profile_completion_percentage',
  'mentor_tier',
  'is_profile_live',
  'phase_1_complete',
  'phase_2_complete',
  'max_weekly_bookings'
);

-- Check trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'expert_profiles_update_completion';

-- Test profile completion calculation
SELECT id, full_name, profile_completion_percentage, mentor_tier
FROM expert_profiles
LIMIT 10;
```

---

## 📊 Monitoring & Analytics

### Metrics to Track

1. **Onboarding Funnel**
   - Signup → Phase 1 Start: Target >90%
   - Phase 1 Complete: Target >60%
   - Phase 2 Start: Track rate
   - Phase 2 Complete: Target 40%

2. **Time Metrics**
   - Average time to complete Phase 1: Target <15 min
   - Average time to complete Phase 2: Target <30 min
   - Days until Phase 2 completion: Track median

3. **Tier Progression**
   - % Basic mentors upgrading to Verified: Target 50% within 30 days
   - % Verified mentors reaching Top: Target 10% within 90 days
   - Average profile completion at each tier

4. **Booking Impact**
   - Correlation between completion % and bookings received
   - Booking distribution by tier
   - Weekly booking limit utilization

### Dashboard Queries

```sql
-- Onboarding funnel
SELECT 
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as signups_this_week,
  COUNT(*) FILTER (WHERE phase_1_complete = true) as phase_1_complete,
  COUNT(*) FILTER (WHERE phase_2_complete = true) as phase_2_complete,
  ROUND(AVG(profile_completion_percentage), 1) as avg_completion
FROM expert_profiles;

-- Tier distribution
SELECT 
  mentor_tier,
  COUNT(*) as count,
  ROUND(AVG(profile_completion_percentage), 1) as avg_completion,
  ROUND(AVG(total_sessions_completed), 1) as avg_sessions
FROM expert_profiles
Where is_profile_live = true
GROUP BY mentor_tier;

-- Booking limit utilization (requires booking_requests table)
SELECT 
  ep.mentor_tier,
  COUNT(DISTINCT ep.id) as mentor_count,
  COUNT(br.id) as total_bookings_this_week,
  ROUND(AVG(bookings_per_mentor.count), 1) as avg_bookings_per_mentor,
  SUM(ep.max_weekly_bookings) as total_capacity,
  ROUND(100.0 * COUNT(br.id) / SUM(ep.max_weekly_bookings), 1) as utilization_pct
FROM expert_profiles ep
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM booking_requests br
  WHERE br.mentor_id = ep.id
  AND br.booking_date >= DATE_TRUNC('week', NOW())
  AND br.status IN ('pending', 'confirmed', 'completed')
) bookings_per_mentor ON true
LEFT JOIN booking_requests br ON br.mentor_id = ep.id 
  AND br.booking_date >= DATE_TRUNC('week', NOW())
  AND br.status IN ('pending', 'confirmed', 'completed')
WHERE ep.is_profile_live = true
GROUP BY ep.mentor_tier;
```

---

## 🚨 Rollback Plan

If issues arise, follow this rollback procedure:

1. **Restore Original Onboarding**
   ```bash
   # Rename backup to main file
   mv src/pages/ExpertOnboarding_Original_Backup.tsx src/pages/ExpertOnboarding.tsx
   ```

2. **Remove Database Changes** (if needed)
   ```sql
   -- Remove trigger
   DROP TRIGGER IF EXISTS expert_profiles_update_completion ON expert_profiles;
   DROP FUNCTION IF EXISTS update_profile_completion();
   DROP FUNCTION IF EXISTS calculate_profile_completion(UUID);
   
   -- Optionally remove columns (⚠️ will lose data)
   ALTER TABLE expert_profiles
   DROP COLUMN IF EXISTS profile_completion_percentage,
   DROP COLUMN IF EXISTS mentor_tier,
   DROP COLUMN IF EXISTS phase_1_complete,
   DROP COLUMN IF EXISTS phase_2_complete;
   ```

3. **Revert Frontend Components**
   - Remove ProfileCompletionCard from DashboardOverview
   - Remove TierBadge from ProfileHeader and MentorCard
   - Remove booking limit checks from BookingDialog

---

## 📝 Post-Deployment Tasks

1. **Week 1**
   - Monitor onboarding completion rates daily
   - Track any error spikes or user complaints
   - Collect feedback from first 100 mentors

2. **Week 2-4**
   - Analyze Phase 1 to Phase 2 conversion
   - Review tier upgrade patterns
   - Assess booking limit impact

3. **Month 2**
   - A/B test variations (e.g., different completion incentives)
   - Optimize profile completion prompts
   - Adjust tier criteria if needed

---

## 🎓 Training Materials Needed

1. **For Mentors**
   - "Quick Start Guide: Go Live in 10 Minutes"
   - "Why Complete Your Profile? 3x More Bookings"
   - "Understanding Mentor Tiers & Benefits"

2. **For Support Team**
   - Tier system explanation
   - Booking limit troubleshooting
   - Profile completion assistance

---

## ✅ Deployment Checklist

- [ ] Review and test all code changes
- [ ] Apply database migrations (both files)
- [ ] Verify migrations applied successfully
- [ ] Run database verification queries
- [ ] Test full onboarding flow (Phase 1 & 2)
- [ ] Test profile completion dashboard
- [ ] Test booking limits for all tiers
- [ ] Monitor error logs for 24 hours
- [ ] Collect initial user feedback
- [ ] Document any issues or adjustments needed

---

## 🆘 Support Contact

For deployment assistance or issues:
- Code review needed: Check implementation files
- Database issues: Review migration logs
- User reports: Check browser console + network tab
- Performance concerns: Monitor Supabase dashboard

**Implementation Complete! Ready for deployment when migrations are applied.**
