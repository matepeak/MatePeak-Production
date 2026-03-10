-- Mark all existing mentors as verified
-- This gives all current mentors a verified badge
-- Future mentors will only get verified after completing Phase 2

-- Update all existing expert_profiles to verified status
UPDATE public.expert_profiles 
SET 
  verification_status = 'verified',
  mentor_tier = 'verified'
WHERE 
  verification_status IS NULL 
  OR verification_status = 'pending'
  OR verification_status = 'unverified';

-- Add comment
COMMENT ON COLUMN public.expert_profiles.verification_status IS 'Verification status: pending, verified, failed. Verified mentors get unlimited bookings.';
COMMENT ON COLUMN public.expert_profiles.mentor_tier IS 'Mentor tier: basic (Phase 1 only), verified (Phase 2 complete), top (premium)';

-- Display results
SELECT 
  COUNT(*) as total_verified_mentors,
  '✅ All existing mentors are now verified and will display the verified badge' as status
FROM public.expert_profiles 
WHERE verification_status = 'verified';
