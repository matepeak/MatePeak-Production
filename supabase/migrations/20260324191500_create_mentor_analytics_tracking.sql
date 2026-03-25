-- Track mentor profile views and booking-click intent for dashboard conversion funnel

CREATE TABLE IF NOT EXISTS public.mentor_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  viewer_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'booking_click')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_analytics_events_mentor_event_created
  ON public.mentor_analytics_events(mentor_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_analytics_events_created
  ON public.mentor_analytics_events(created_at DESC);

ALTER TABLE public.mentor_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.track_mentor_analytics_event(
  p_mentor_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
BEGIN
  actor_id := auth.uid();

  IF p_mentor_id IS NULL THEN
    RAISE EXCEPTION 'mentor_id is required';
  END IF;

  IF p_event_type IS NULL OR p_event_type NOT IN ('profile_view', 'booking_click') THEN
    RAISE EXCEPTION 'invalid event_type: %', p_event_type;
  END IF;

  INSERT INTO public.mentor_analytics_events (
    mentor_id,
    viewer_id,
    event_type,
    metadata
  ) VALUES (
    p_mentor_id,
    actor_id,
    p_event_type,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mentor_funnel_metrics(
  p_mentor_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  views BIGINT,
  clicks BIGINT,
  bookings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
  effective_days INTEGER;
BEGIN
  actor_id := auth.uid();

  IF p_mentor_id IS NULL THEN
    RAISE EXCEPTION 'mentor_id is required';
  END IF;

  IF actor_id IS NULL OR (actor_id <> p_mentor_id AND NOT is_admin(actor_id)) THEN
    RAISE EXCEPTION 'Unauthorized: access denied';
  END IF;

  effective_days := GREATEST(COALESCE(p_days, 30), 1);

  RETURN QUERY
  WITH cutoff AS (
    SELECT now() - make_interval(days => effective_days) AS at
  )
  SELECT
    COALESCE((
      SELECT COUNT(*)
      FROM public.mentor_analytics_events e, cutoff c
      WHERE e.mentor_id = p_mentor_id
        AND e.event_type = 'profile_view'
        AND e.created_at >= c.at
    ), 0)::BIGINT AS views,
    COALESCE((
      SELECT COUNT(*)
      FROM public.mentor_analytics_events e, cutoff c
      WHERE e.mentor_id = p_mentor_id
        AND e.event_type = 'booking_click'
        AND e.created_at >= c.at
    ), 0)::BIGINT AS clicks,
    COALESCE((
      SELECT COUNT(*)
      FROM public.bookings b, cutoff c
      WHERE b.expert_id = p_mentor_id
        AND LOWER(COALESCE(b.status, '')) IN ('confirmed', 'completed')
        AND b.created_at >= c.at
    ), 0)::BIGINT AS bookings;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_mentor_analytics_event(UUID, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.track_mentor_analytics_event(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentor_funnel_metrics(UUID, INTEGER) TO authenticated;
