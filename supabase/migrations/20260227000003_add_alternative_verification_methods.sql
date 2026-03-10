-- Add alternative verification method fields
ALTER TABLE public.expert_profiles
ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'camera' CHECK (verification_method IN ('camera', 'document', 'phone', 'linkedin', 'skip')),
ADD COLUMN IF NOT EXISTS verification_document_url TEXT,
ADD COLUMN IF NOT EXISTS verified_phone TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Create index for faster queries on verification method
CREATE INDEX IF NOT EXISTS idx_expert_profiles_verification_method ON public.expert_profiles(verification_method);

-- Add comments
COMMENT ON COLUMN public.expert_profiles.verification_method IS 'Method used for identity verification: camera (live), document (ID upload), phone (SMS), linkedin (social), skip (deferred)';
COMMENT ON COLUMN public.expert_profiles.verification_document_url IS 'URL of uploaded government ID document for manual verification';
COMMENT ON COLUMN public.expert_profiles.verified_phone IS 'Phone number verified via SMS OTP';
COMMENT ON COLUMN public.expert_profiles.linkedin_url IS 'LinkedIn profile URL for social verification';
