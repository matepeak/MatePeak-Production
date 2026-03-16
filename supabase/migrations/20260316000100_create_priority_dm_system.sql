-- Priority DM system (Phase 1)
-- Single paid message + single mentor reply, then auto-delete 24h after requester reads.

-- ==============================
-- 1) Core tables
-- ==============================

CREATE TABLE IF NOT EXISTS public.priority_dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('student', 'mentor')),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT NULL,
  share_contact_info BOOLEAN NOT NULL DEFAULT false,
  message_text TEXT NOT NULL,
  mentor_reply_text TEXT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'answered', 'read_by_requester', 'deleted')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ NULL,
  read_at TIMESTAMPTZ NULL,
  delete_after TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT priority_dm_not_self CHECK (requester_id <> mentor_id)
);

CREATE TABLE IF NOT EXISTS public.priority_dm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.priority_dm_threads(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================
-- 2) Indexes
-- ==============================

CREATE INDEX IF NOT EXISTS idx_priority_dm_threads_mentor_status_submitted
  ON public.priority_dm_threads(mentor_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_priority_dm_threads_requester_status_created
  ON public.priority_dm_threads(requester_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_priority_dm_threads_delete_after
  ON public.priority_dm_threads(delete_after)
  WHERE status = 'read_by_requester';

CREATE INDEX IF NOT EXISTS idx_priority_dm_events_thread_created
  ON public.priority_dm_events(thread_id, created_at DESC);

-- ==============================
-- 3) Realtime + updated_at
-- ==============================

ALTER TABLE public.priority_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_dm_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_priority_dm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_priority_dm_threads_updated_at ON public.priority_dm_threads;
CREATE TRIGGER trg_priority_dm_threads_updated_at
BEFORE UPDATE ON public.priority_dm_threads
FOR EACH ROW
EXECUTE FUNCTION public.set_priority_dm_updated_at();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.priority_dm_threads;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

-- ==============================
-- 4) RLS policies
-- ==============================

DROP POLICY IF EXISTS "Requester can view own priority dm" ON public.priority_dm_threads;
CREATE POLICY "Requester can view own priority dm"
  ON public.priority_dm_threads
  FOR SELECT
  USING (requester_id = auth.uid());

DROP POLICY IF EXISTS "Mentor can view assigned priority dm" ON public.priority_dm_threads;
CREATE POLICY "Mentor can view assigned priority dm"
  ON public.priority_dm_threads
  FOR SELECT
  USING (mentor_id = auth.uid());

DROP POLICY IF EXISTS "Requester can insert own priority dm" ON public.priority_dm_threads;
CREATE POLICY "Requester can insert own priority dm"
  ON public.priority_dm_threads
  FOR INSERT
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Mentor can update submitted priority dm" ON public.priority_dm_threads;
CREATE POLICY "Mentor can update submitted priority dm"
  ON public.priority_dm_threads
  FOR UPDATE
  USING (mentor_id = auth.uid() AND status = 'submitted')
  WITH CHECK (mentor_id = auth.uid());

DROP POLICY IF EXISTS "Requester can mark read on own priority dm" ON public.priority_dm_threads;
CREATE POLICY "Requester can mark read on own priority dm"
  ON public.priority_dm_threads
  FOR UPDATE
  USING (requester_id = auth.uid() AND status = 'answered')
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Participants can view priority dm events" ON public.priority_dm_events;
CREATE POLICY "Participants can view priority dm events"
  ON public.priority_dm_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.priority_dm_threads t
      WHERE t.id = priority_dm_events.thread_id
        AND (t.requester_id = auth.uid() OR t.mentor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Service can insert priority dm events" ON public.priority_dm_events;
CREATE POLICY "Service can insert priority dm events"
  ON public.priority_dm_events
  FOR INSERT
  WITH CHECK (true);

-- ==============================
-- 5) Functions (API contract)
-- ==============================

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

CREATE OR REPLACE FUNCTION public.reply_priority_dm(
  p_thread_id UUID,
  p_reply_text TEXT
)
RETURNS public.priority_dm_threads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_thread public.priority_dm_threads;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reply_text IS NULL OR length(trim(p_reply_text)) = 0 THEN
    RAISE EXCEPTION 'Reply is required';
  END IF;

  IF length(p_reply_text) > 2000 THEN
    RAISE EXCEPTION 'Reply is too long (max 2000 chars)';
  END IF;

  UPDATE public.priority_dm_threads t
  SET mentor_reply_text = trim(p_reply_text),
      status = 'answered',
      answered_at = now()
  WHERE t.id = p_thread_id
    AND t.mentor_id = v_user_id
    AND t.status = 'submitted'
  RETURNING * INTO v_thread;

  IF v_thread.id IS NULL THEN
    RAISE EXCEPTION 'Thread not found, unauthorized, or already answered';
  END IF;

  INSERT INTO public.priority_dm_events (thread_id, actor_id, event_type)
  VALUES (v_thread.id, v_user_id, 'answered');

  RETURN v_thread;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_priority_dm_read(
  p_thread_id UUID
)
RETURNS public.priority_dm_threads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_thread public.priority_dm_threads;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.priority_dm_threads t
  SET status = 'read_by_requester',
      read_at = COALESCE(t.read_at, now()),
      delete_after = COALESCE(t.delete_after, now() + interval '24 hours')
  WHERE t.id = p_thread_id
    AND t.requester_id = v_user_id
    AND t.status = 'answered'
  RETURNING * INTO v_thread;

  IF v_thread.id IS NULL THEN
    SELECT * INTO v_thread
    FROM public.priority_dm_threads t
    WHERE t.id = p_thread_id
      AND t.requester_id = v_user_id
      AND t.status = 'read_by_requester';

    IF v_thread.id IS NULL THEN
      RAISE EXCEPTION 'Thread not found, unauthorized, or invalid status';
    END IF;
  ELSE
    INSERT INTO public.priority_dm_events (thread_id, actor_id, event_type)
    VALUES (v_thread.id, v_user_id, 'read_by_requester');
  END IF;

  RETURN v_thread;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_mentor_priority_dm_pending()
RETURNS SETOF public.priority_dm_threads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.priority_dm_threads t
  WHERE t.mentor_id = auth.uid()
    AND t.status = 'submitted'
  ORDER BY t.submitted_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_requester_priority_dm()
RETURNS SETOF public.priority_dm_threads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.priority_dm_threads t
  WHERE t.requester_id = auth.uid()
    AND t.status <> 'deleted'
  ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.delete_read_priority_dm_after_24h()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  WITH doomed AS (
    SELECT id
    FROM public.priority_dm_threads
    WHERE status = 'read_by_requester'
      AND delete_after IS NOT NULL
      AND delete_after <= now()
  )
  DELETE FROM public.priority_dm_threads t
  USING doomed d
  WHERE t.id = d.id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- ==============================
-- 6) Grants for authenticated usage
-- ==============================

GRANT EXECUTE ON FUNCTION public.create_priority_dm(UUID, TEXT, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reply_priority_dm(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_priority_dm_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_mentor_priority_dm_pending() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_requester_priority_dm() TO authenticated;

COMMENT ON TABLE public.priority_dm_threads IS 'Paid Priority DM threads (single message + single mentor reply in Phase 1).';
COMMENT ON TABLE public.priority_dm_events IS 'Audit trail for Priority DM state transitions.';
COMMENT ON FUNCTION public.delete_read_priority_dm_after_24h() IS 'Service-role cleanup function to hard delete read Priority DMs after 24 hours.';
