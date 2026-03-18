ALTER TABLE public.expert_profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_expert_profiles_last_seen
ON public.expert_profiles (last_seen DESC);