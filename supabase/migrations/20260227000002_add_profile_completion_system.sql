-- Add profile completion and tiered system fields
ALTER TABLE public.expert_profiles
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0 CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100),
ADD COLUMN IF NOT EXISTS mentor_tier TEXT DEFAULT 'basic' CHECK (mentor_tier IN ('basic', 'verified', 'top')),
ADD COLUMN IF NOT EXISTS is_profile_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phase_1_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phase_2_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_sessions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS max_weekly_bookings INTEGER DEFAULT 5;

-- Make some fields optional for fast onboarding
ALTER TABLE public.expert_profiles
ALTER COLUMN introduction DROP NOT NULL,
ALTER COLUMN teaching_experience DROP NOT NULL,
ALTER COLUMN motivation DROP NOT NULL,
ALTER COLUMN education DROP NOT NULL,
ALTER COLUMN teaching_certifications DROP NOT NULL,
ALTER COLUMN availability_json DROP NOT NULL,
ALTER COLUMN social_links DROP NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expert_profiles_mentor_tier 
  ON public.expert_profiles(mentor_tier, average_rating DESC);

CREATE INDEX IF NOT EXISTS idx_expert_profiles_is_live 
  ON public.expert_profiles(is_profile_live, created_at DESC) 
  WHERE is_profile_live = true;

-- Add comments
COMMENT ON COLUMN public.expert_profiles.profile_completion_percentage IS 'Percentage of profile completion (0-100)';
COMMENT ON COLUMN public.expert_profiles.mentor_tier IS 'Mentor tier: basic (new), verified (credentials checked), top (high performance)';
COMMENT ON COLUMN public.expert_profiles.is_profile_live IS 'Whether the profile is publicly visible';
COMMENT ON COLUMN public.expert_profiles.total_sessions_completed IS 'Total number of completed mentoring sessions';
COMMENT ON COLUMN public.expert_profiles.average_rating IS 'Average rating from students (0-5)';
COMMENT ON COLUMN public.expert_profiles.response_rate IS 'Percentage of booking requests responded to within 24h';
COMMENT ON COLUMN public.expert_profiles.max_weekly_bookings IS 'Maximum bookings allowed per week based on tier';

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM expert_profiles WHERE id = profile_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Core fields (40%)
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN completion := completion + 5; END IF;
  IF profile_record.username IS NOT NULL AND profile_record.username != '' THEN completion := completion + 5; END IF;
  IF profile_record.category IS NOT NULL THEN completion := completion + 10; END IF;
  IF profile_record.headline IS NOT NULL AND profile_record.headline != '' THEN completion := completion + 10; END IF;
  IF profile_record.service_pricing IS NOT NULL THEN completion := completion + 10; END IF;
  
  -- Verification (20%) - Now accepts pending status
  IF profile_record.verification_status = 'verified' THEN 
    completion := completion + 20; 
  ELSIF profile_record.verification_status = 'pending' THEN 
    completion := completion + 10; -- Partial credit for pending verification
  END IF;
  
  -- Profile details (25%)
  IF profile_record.introduction IS NOT NULL AND profile_record.introduction != '' THEN completion := completion + 10; END IF;
  IF profile_record.teaching_experience IS NOT NULL AND profile_record.teaching_experience != '' THEN completion := completion + 8; END IF;
  IF profile_record.motivation IS NOT NULL AND profile_record.motivation != '' THEN completion := completion + 7; END IF;
  
  -- Supporting info (15%)
  IF profile_record.education IS NOT NULL AND jsonb_array_length(profile_record.education) > 0 THEN completion := completion + 5; END IF;
  IF profile_record.profile_picture_url IS NOT NULL AND profile_record.profile_picture_url != '' THEN completion := completion + 5; END IF;
  IF profile_record.availability_json IS NOT NULL AND profile_record.availability_json != '' THEN completion := completion + 3; END IF;
  IF profile_record.social_links IS NOT NULL AND jsonb_object_keys(profile_record.social_links) IS NOT NULL THEN completion := completion + 2; END IF;
  
  RETURN LEAST(completion, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update profile completion percentage
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion_percentage := calculate_profile_completion(NEW.id);
  
  -- Auto-upgrade to verified tier if criteria met
  -- Now accepts both verified and pending verification status
  IF (NEW.verification_status = 'verified' OR NEW.verification_status = 'pending')
     AND NEW.profile_completion_percentage >= 70 
     AND NEW.mentor_tier = 'basic' THEN
    NEW.mentor_tier := 'verified';
    NEW.max_weekly_bookings := 15;
  END IF;
  
  -- Auto-upgrade to top tier if performance criteria met
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

CREATE TRIGGER expert_profiles_update_completion
  BEFORE INSERT OR UPDATE ON public.expert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion();
