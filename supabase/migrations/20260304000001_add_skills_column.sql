-- Add skills column to expert_profiles table
-- This column will store general skills selected by mentors during onboarding

ALTER TABLE public.expert_profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.expert_profiles.skills IS 'Array of general skills (e.g., Communication, Leadership, Problem Solving). Selected during onboarding to highlight mentor capabilities.';

-- Create index for faster skill-based searches
CREATE INDEX IF NOT EXISTS idx_expert_profiles_skills ON public.expert_profiles USING GIN (skills);
