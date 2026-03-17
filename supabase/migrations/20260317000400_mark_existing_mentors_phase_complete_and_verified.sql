-- ============================================================================
-- Mark all existing mentors as fully completed & verified
-- Existing mentors become unrestricted.
-- New mentors created after this migration remain restricted by default.
-- ============================================================================

UPDATE public.expert_profiles
SET
  phase_1_complete = true,
  phase_2_complete = true,
  verification_status = 'verified',
  mentor_tier = CASE
    WHEN mentor_tier IS NULL OR mentor_tier = 'basic' THEN 'verified'
    ELSE mentor_tier
  END,
  max_weekly_bookings = CASE
    WHEN COALESCE(max_weekly_bookings, 0) < 15 THEN 15
    ELSE max_weekly_bookings
  END,
  updated_at = NOW();

COMMENT ON COLUMN public.expert_profiles.phase_1_complete IS
  'Phase 1 onboarding completion flag. Existing mentors were backfilled to true on 2026-03-17.';

COMMENT ON COLUMN public.expert_profiles.phase_2_complete IS
  'Phase 2 onboarding completion flag. Existing mentors were backfilled to true on 2026-03-17.';
