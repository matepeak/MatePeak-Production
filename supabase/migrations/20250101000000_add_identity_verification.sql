-- Add identity verification fields to expert_profiles table
ALTER TABLE public.expert_profiles
ADD COLUMN IF NOT EXISTS verification_photo_url TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_expert_profiles_verification_status ON public.expert_profiles(verification_status);

-- Add comment for documentation
COMMENT ON COLUMN public.expert_profiles.verification_photo_url IS 'URL of the identity verification photo (live selfie with liveness detection)';
COMMENT ON COLUMN public.expert_profiles.verification_status IS 'Status of identity verification: pending, verified, or failed';
COMMENT ON COLUMN public.expert_profiles.verification_date IS 'Timestamp when identity verification was completed';

-- Create storage bucket for verification photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-photos', 'verification-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- IMPORTANT: Create Storage Policies Manually
-- ========================================
-- You need to create the following policies in Supabase Dashboard:
-- Go to: Storage > verification-photos > Policies > New Policy
--
-- Policy 1: "Users can upload their own verification photos"
-- Operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
-- (bucket_id = 'verification-photos'::text) AND ((((storage.foldername(name))[1] = 'verification-photos'::text) AND ((auth.uid())::text = (regexp_match(name, 'verification_([a-f0-9-]+)_'::text))[1])))
--
-- Policy 2: "Users can view their own verification photos"
-- Operation: SELECT
-- Target roles: authenticated
-- USING expression:
-- (bucket_id = 'verification-photos'::text) AND ((((storage.foldername(name))[1] = 'verification-photos'::text) AND ((auth.uid())::text = (regexp_match(name, 'verification_([a-f0-9-]+)_'::text))[1])))
--
-- Policy 3: "Users can delete their own verification photos"
-- Operation: DELETE
-- Target roles: authenticated
-- USING expression:
-- (bucket_id = 'verification-photos'::text) AND ((((storage.foldername(name))[1] = 'verification-photos'::text) AND ((auth.uid())::text = (regexp_match(name, 'verification_([a-f0-9-]+)_'::text))[1])))
--
-- Note: These policies ensure users can only access their own verification photos

