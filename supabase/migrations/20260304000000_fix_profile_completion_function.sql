-- Fix the calculate_profile_completion function to avoid "argument of AND must not return a set" error
-- The issue was using jsonb_object_keys() directly in an AND condition
-- Also add missing country_of_birth column

-- Add country_of_birth column if it doesn't exist
ALTER TABLE public.expert_profiles 
ADD COLUMN IF NOT EXISTS country_of_birth TEXT;

COMMENT ON COLUMN public.expert_profiles.country_of_birth IS 'Country of birth for the expert mentor';

-- Fix the calculate_profile_completion function
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
  -- Fixed: Check if social_links has any keys using jsonb_typeof instead of jsonb_object_keys
  IF profile_record.social_links IS NOT NULL AND jsonb_typeof(profile_record.social_links) = 'object' AND profile_record.social_links != '{}'::jsonb THEN completion := completion + 2; END IF;
  
  RETURN LEAST(completion, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_profile_completion IS 'Calculates profile completion percentage (0-100) for expert profiles';
