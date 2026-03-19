-- ============================================================================
-- Verify currently onboarded, active mentors
-- Excludes profiles still in draft/pending/inactive/suspended style states.
-- ============================================================================

WITH eligible_mentors AS (
  SELECT id
  FROM public.expert_profiles
  WHERE COALESCE(profile_status, 'active') = 'active'
    AND COALESCE(phase_1_complete, false) = true
    AND COALESCE(is_profile_live, false) = true
)
UPDATE public.expert_profiles ep
SET
  is_verified = true,
  verification_status = 'verified',
  mentor_tier = CASE
    WHEN ep.mentor_tier = 'top' THEN 'top'
    ELSE 'verified'
  END,
  max_weekly_bookings = GREATEST(COALESCE(ep.max_weekly_bookings, 0), 15),
  updated_at = NOW()
FROM eligible_mentors em
WHERE ep.id = em.id;

COMMENT ON COLUMN public.expert_profiles.is_verified IS
  'Admin/platform verification flag. Active+live+phase-1-complete mentors were backfilled to true on 2026-03-19.';
