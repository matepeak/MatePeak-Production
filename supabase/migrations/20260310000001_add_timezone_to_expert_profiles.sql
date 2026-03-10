-- Add timezone column to expert_profiles table
-- This stores the mentor's timezone preference for availability and booking management

ALTER TABLE public.expert_profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

-- Add comment to explain the column
COMMENT ON COLUMN expert_profiles.timezone IS 'Mentor''s timezone preference for availability and bookings (IANA timezone format)';
