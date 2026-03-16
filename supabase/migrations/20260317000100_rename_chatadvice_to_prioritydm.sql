-- ============================================================
-- Rename session_type 'chatAdvice' → 'priorityDm' everywhere
-- ============================================================

-- 1) Rename existing booking rows
UPDATE public.bookings
SET session_type = 'priorityDm'
WHERE session_type = 'chatAdvice';

-- 2) Rename JSONB key in expert_profiles.service_pricing
UPDATE public.expert_profiles
SET service_pricing = (service_pricing - 'chatAdvice')
  || jsonb_build_object('priorityDm', service_pricing -> 'chatAdvice')
WHERE service_pricing ? 'chatAdvice';

-- 3) Rename JSONB key in expert_profiles.services (legacy boolean flags)
UPDATE public.expert_profiles
SET services = (services - 'chatAdvice')
  || jsonb_build_object('priorityDm', services -> 'chatAdvice')
WHERE services ? 'chatAdvice';

-- 4) Update column comment
COMMENT ON COLUMN public.bookings.session_type IS
  'Type of session: oneOnOneSession, priorityDm, digitalProducts, notes';

-- 5) Patch create_priority_dm to check priorityDm instead of chatAdvice
CREATE OR REPLACE FUNCTION public.create_priority_dm(
  p_mentor_id UUID,
  p_message_text TEXT,
  p_share_contact_info BOOLEAN,
  p_booking_id UUID
)
RETURNS public.priority_dm_threads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_requester_name TEXT;
  v_requester_email TEXT;
  v_requester_phone TEXT;
  v_requester_role TEXT;
  v_booking_ok BOOLEAN := false;
  v_thread public.priority_dm_threads;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_mentor_id IS NULL THEN
    RAISE EXCEPTION 'Mentor id is required';
  END IF;

  IF v_user_id = p_mentor_id THEN
    RAISE EXCEPTION 'Requester and mentor cannot be the same user';
  END IF;

  IF p_message_text IS NULL OR length(trim(p_message_text)) = 0 THEN
    RAISE EXCEPTION 'Message is required';
  END IF;

  IF length(p_message_text) > 2000 THEN
    RAISE EXCEPTION 'Message is too long (max 2000 chars)';
  END IF;

  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'Paid entitlement is required (booking_id missing)';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = p_booking_id
      AND b.user_id = v_user_id
      AND b.expert_id = p_mentor_id
      AND b.session_type = 'priorityDm'
      AND b.status IN ('confirmed', 'completed')
  ) INTO v_booking_ok;

  IF NOT v_booking_ok THEN
    RAISE EXCEPTION 'Invalid or unauthorized booking entitlement';
  END IF;

  SELECT p.full_name, p.email
    INTO v_requester_name, v_requester_email
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_requester_name IS NULL THEN
    v_requester_name := 'User';
  END IF;

  IF v_requester_email IS NULL THEN
    RAISE EXCEPTION 'Requester email is required in profile';
  END IF;

  SELECT b.user_phone
    INTO v_requester_phone
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.user_id = v_user_id
    AND b.expert_id = p_mentor_id
  LIMIT 1;

  SELECT CASE WHEN EXISTS (
      SELECT 1 FROM public.expert_profiles ep WHERE ep.id = v_user_id
    ) THEN 'mentor' ELSE 'student' END
    INTO v_requester_role;

  INSERT INTO public.priority_dm_threads (
    booking_id,
    requester_id,
    requester_role,
    mentor_id,
    requester_name,
    requester_email,
    requester_phone,
    share_contact_info,
    message_text,
    status,
    submitted_at
  ) VALUES (
    p_booking_id,
    v_user_id,
    v_requester_role,
    p_mentor_id,
    v_requester_name,
    v_requester_email,
    v_requester_phone,
    COALESCE(p_share_contact_info, false),
    trim(p_message_text),
    'submitted',
    now()
  ) RETURNING * INTO v_thread;

  INSERT INTO public.priority_dm_events (thread_id, actor_id, event_type, metadata)
  VALUES (
    v_thread.id,
    v_user_id,
    'submitted',
    jsonb_build_object('share_contact_info', COALESCE(p_share_contact_info, false))
  );

  RETURN v_thread;
END;
$$;
