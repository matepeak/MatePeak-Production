-- Expose confirmed mentor slots via SECURITY DEFINER so availability checks are not blocked by bookings RLS.
CREATE OR REPLACE FUNCTION public.get_confirmed_booked_slots(
  p_expert_id UUID,
  p_scheduled_date TEXT
)
RETURNS TABLE (
  scheduled_time TEXT,
  duration INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.scheduled_time,
    b.duration
  FROM public.bookings b
  WHERE b.expert_id = p_expert_id
    AND b.scheduled_date::text = p_scheduled_date
    AND b.status = 'confirmed'
    AND b.session_type = 'oneOnOneSession'
  ORDER BY b.scheduled_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_confirmed_booked_slots(UUID, TEXT) TO anon, authenticated, service_role;
