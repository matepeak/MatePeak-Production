-- ============================================================================
-- Make review request eligibility duration-aware
-- Trigger review request when scheduled session end time has passed
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sessions_ready_for_review()
RETURNS TABLE (
  booking_id UUID,
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  mentor_id UUID,
  mentor_name TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  duration INTEGER,
  service_type TEXT,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS booking_id,
    b.user_id AS student_id,
    COALESCE(b.user_name, p.full_name) AS student_name,
    COALESCE(b.user_email, p.email) AS student_email,
    b.expert_id AS mentor_id,
    ep.full_name AS mentor_name,
    b.scheduled_date,
    b.scheduled_time,
    b.duration,
    b.session_type AS service_type,
    (
      b.scheduled_date::timestamp
      + b.scheduled_time::time
      + make_interval(mins => GREATEST(COALESCE(b.duration, 60), 1))
    )::timestamptz AS completed_at
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN public.expert_profiles ep ON ep.id = b.expert_id
  WHERE
    b.status = 'completed'
    AND b.review_requested_at IS NULL
    AND b.scheduled_date IS NOT NULL
    AND NULLIF(TRIM(b.scheduled_time), '') IS NOT NULL
    AND (
      b.scheduled_date::timestamp
      + b.scheduled_time::time
      + make_interval(mins => GREATEST(COALESCE(b.duration, 60), 1))
    ) <= NOW()
    AND NOT EXISTS (
      SELECT 1
      FROM public.reviews r
      WHERE r.booking_id = b.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sessions_ready_for_review() IS
  'Returns completed sessions whose scheduled end time (start + duration) has passed and still need review request emails';
