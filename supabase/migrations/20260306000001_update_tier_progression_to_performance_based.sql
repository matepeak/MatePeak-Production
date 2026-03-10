-- Update tier progression to be performance-based instead of verification-based
-- This aligns with the new strategy: remove unverified credential collection,
-- focus on actual mentor performance (sessions, ratings, reviews)
-- PLUS phone verification as mandatory identity check

-- Drop old trigger first
DROP TRIGGER IF EXISTS expert_profiles_update_completion ON public.expert_profiles;

-- Add phone verification columns if they don't exist
ALTER TABLE public.expert_profiles 
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Update the profile completion function to include phone verification requirement
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion_percentage := calculate_profile_completion(NEW.id);
  
  -- Auto-upgrade to verified tier based on PERFORMANCE + PHONE VERIFICATION
  -- Criteria: Phone verified, 5+ completed sessions, 4.0+ rating, active profile
  IF NEW.phone_verified = true
     AND NEW.total_sessions_completed >= 5 
     AND NEW.average_rating >= 4.0 
     AND NEW.is_profile_live = true
     AND NEW.mentor_tier = 'basic' THEN
    NEW.mentor_tier := 'verified';
    NEW.max_weekly_bookings := 15;
  END IF;
  
  -- Auto-upgrade to top tier if exceptional performance
  IF NEW.total_sessions_completed >= 10 
     AND NEW.average_rating >= 4.5 
     AND NEW.response_rate >= 90 
     AND NEW.mentor_tier = 'verified' THEN
    NEW.mentor_tier := 'top';
    NEW.max_weekly_bookings := 999; -- Unlimited
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER expert_profiles_update_completion
  BEFORE INSERT OR UPDATE ON public.expert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion();

-- Add helpful comments
COMMENT ON FUNCTION update_profile_completion() IS 'Auto-upgrades mentor tier based on phone verification + performance metrics (sessions, ratings) rather than credential verification';

-- Update column comments to reflect new strategy
COMMENT ON COLUMN public.expert_profiles.mentor_tier IS 'Mentor tier: basic (new, unverified phone OR 0-4 sessions), verified (phone verified + 5+ sessions + 4.0+ rating), top (10+ sessions, 4.5+ rating, 90%+ response)';
COMMENT ON COLUMN public.expert_profiles.phone_verified IS 'Phone number verified via SMS OTP (Supabase Phone Auth) - required for verified tier upgrade';
COMMENT ON COLUMN public.expert_profiles.phone_verified_at IS 'Timestamp when phone was verified via OTP';
COMMENT ON COLUMN public.expert_profiles.verification_status IS 'DEPRECATED: No longer used for tier progression. Will be used for optional advanced verification (LinkedIn OAuth, face verification) in future';
