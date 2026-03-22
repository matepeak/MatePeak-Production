-- Migration: Add default session duration (60 min) to existing oneOnOneSession entries
-- that do not yet have a duration field in their service_pricing JSONB.

UPDATE public.expert_profiles
SET service_pricing = jsonb_set(
  service_pricing,
  '{oneOnOneSession,duration}',
  '60'::jsonb
)
WHERE
  service_pricing ? 'oneOnOneSession'
  AND (service_pricing -> 'oneOnOneSession') IS NOT NULL
  AND (service_pricing -> 'oneOnOneSession' -> 'duration') IS NULL;
