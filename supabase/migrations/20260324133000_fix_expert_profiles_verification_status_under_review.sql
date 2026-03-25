-- Fix expert profile verification status support for `under_review`
-- This migration was intended to align DB constraints with Phase 2 workflow.

ALTER TABLE public.expert_profiles
DROP CONSTRAINT IF EXISTS expert_profiles_verification_status_check;

ALTER TABLE public.expert_profiles
ADD CONSTRAINT expert_profiles_verification_status_check
CHECK (verification_status IN ('pending', 'under_review', 'verified', 'failed'));

-- Backfill mentors who are in Phase 2 review but still marked as pending.
UPDATE public.expert_profiles
SET
	verification_status = 'under_review',
	updated_at = NOW()
WHERE phase2_review_status = 'under_review'
	AND COALESCE(verification_status, 'pending') = 'pending';