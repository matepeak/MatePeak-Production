-- Fix verification_status constraint to allow 'skipped' status
-- Drop the existing constraint
ALTER TABLE public.expert_profiles
DROP CONSTRAINT IF EXISTS expert_profiles_verification_status_check;

-- Add updated constraint (keeping original values only)
ALTER TABLE public.expert_profiles
ADD CONSTRAINT expert_profiles_verification_status_check
CHECK (verification_status IN ('pending', 'verified', 'failed'));

-- Update comment for documentation
COMMENT ON COLUMN public.expert_profiles.verification_status IS 'Status of identity verification: pending, verified, or failed';
