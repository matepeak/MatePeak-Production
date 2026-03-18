-- Core in-app notifications system
-- Supports mentor + student notifications for booking lifecycle,
-- custom time requests, and priority DM.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'booking_request', 'priority_dm', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source_table TEXT NULL CHECK (
    source_table IS NULL OR source_table IN ('bookings', 'booking_requests', 'priority_dm_threads', 'system')
  ),
  source_id UUID NULL,
  route_view TEXT NULL CHECK (
    route_view IS NULL OR route_view IN ('sessions', 'requests', 'messages', 'reviews', 'time-request', 'overview', 'profile')
  ),
  route_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_key TEXT NULL,
  read_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicates from trigger retries
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event_key_recipient
  ON public.notifications(recipient_id, event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
  ON public.notifications(recipient_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_source
  ON public.notifications(source_table, source_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_notifications_updated_at();

-- Human-readable service/session type labels for notification bodies
CREATE OR REPLACE FUNCTION public.format_session_type_label(p_session_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_norm TEXT;
BEGIN
  IF p_session_type IS NULL OR length(trim(p_session_type)) = 0 THEN
    RETURN 'Session';
  END IF;

  v_norm := lower(regexp_replace(p_session_type, '[^a-zA-Z0-9]+', '', 'g'));

  IF v_norm IN ('oneononesession', 'oneonone', 'oneononecall') THEN
    RETURN '1-on-1 Career Strategy Call';
  ELSIF v_norm IN ('prioritydm', 'chatadvice') THEN
    RETURN 'Career Clarity - Ask Anything';
  ELSIF v_norm IN ('digitalproducts', 'digitalproduct') THEN
    RETURN 'Resume & LinkedIn Starter Pack';
  END IF;

  RETURN initcap(regexp_replace(p_session_type, '([a-z])([A-Z])', '\1 \2', 'g'));
END;
$$;

-- Producer: Booking created -> mentor notification
CREATE OR REPLACE FUNCTION public.notify_on_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expert_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    source_table,
    source_id,
    route_view,
    metadata,
    event_key
  )
  VALUES (
    NEW.expert_id,
    NEW.user_id,
    'booking',
    'New Booking Request',
    format_session_type_label(NEW.session_type),
    'bookings',
    NEW.id,
    'sessions',
    jsonb_build_object(
      'session_type', NEW.session_type,
      'status', NEW.status
    ),
    'booking.created.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_insert ON public.bookings;
CREATE TRIGGER trg_notify_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_booking_insert();

-- Producer: Booking status update -> student notification
CREATE OR REPLACE FUNCTION public.notify_on_booking_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  v_title := CASE
    WHEN NEW.status = 'confirmed' THEN 'Booking Confirmed'
    WHEN NEW.status = 'cancelled' THEN 'Booking Cancelled'
    ELSE 'Booking Updated'
  END;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    source_table,
    source_id,
    route_view,
    metadata,
    event_key
  )
  VALUES (
    NEW.user_id,
    NEW.expert_id,
    'booking',
    v_title,
    format_session_type_label(NEW.session_type),
    'bookings',
    NEW.id,
    'sessions',
    jsonb_build_object(
      'session_type', NEW.session_type,
      'status', NEW.status
    ),
    'booking.status.' || NEW.status || '.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_status_update ON public.bookings;
CREATE TRIGGER trg_notify_booking_status_update
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_booking_status_update();

-- Producer: Custom time request created -> mentor notification
CREATE OR REPLACE FUNCTION public.notify_on_booking_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    source_table,
    source_id,
    route_view,
    metadata,
    event_key
  )
  VALUES (
    NEW.mentor_id,
    NEW.mentee_id,
    'booking_request',
    'New Time Request',
    to_char(NEW.requested_date, 'Mon DD') || ' ' || NEW.requested_start_time || ' - ' || NEW.requested_end_time,
    'booking_requests',
    NEW.id,
    'requests',
    jsonb_build_object(
      'status', NEW.status,
      'requested_date', NEW.requested_date,
      'requested_start_time', NEW.requested_start_time,
      'requested_end_time', NEW.requested_end_time
    ),
    'booking_request.created.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_request_insert ON public.booking_requests;
CREATE TRIGGER trg_notify_booking_request_insert
AFTER INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_booking_request_insert();

-- Producer: Custom time request decision -> student notification
CREATE OR REPLACE FUNCTION public.notify_on_booking_request_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'declined') THEN
    RETURN NEW;
  END IF;

  v_title := CASE
    WHEN NEW.status = 'approved' THEN 'Time Request Approved'
    ELSE 'Time Request Declined'
  END;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    source_table,
    source_id,
    route_view,
    metadata,
    event_key
  )
  VALUES (
    NEW.mentee_id,
    NEW.mentor_id,
    'booking_request',
    v_title,
    coalesce(NEW.mentor_response, 'Your mentor responded to your time request'),
    'booking_requests',
    NEW.id,
    'time-request',
    jsonb_build_object(
      'status', NEW.status,
      'mentor_response', NEW.mentor_response
    ),
    'booking_request.status.' || NEW.status || '.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_request_status_update ON public.booking_requests;
CREATE TRIGGER trg_notify_booking_request_status_update
AFTER UPDATE OF status ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_booking_request_status_update();

-- Producer: Priority DM created -> mentor notification
CREATE OR REPLACE FUNCTION public.notify_on_priority_dm_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    source_table,
    source_id,
    route_view,
    metadata,
    event_key
  )
  VALUES (
    NEW.mentor_id,
    NEW.requester_id,
    'priority_dm',
    'New Priority DM Message',
    left(NEW.message_text, 120),
    'priority_dm_threads',
    NEW.id,
    'messages',
    jsonb_build_object(
      'status', NEW.status,
      'requester_name', NEW.requester_name
    ),
    'priority_dm.created.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_priority_dm_insert ON public.priority_dm_threads;
CREATE TRIGGER trg_notify_priority_dm_insert
AFTER INSERT ON public.priority_dm_threads
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_priority_dm_insert();

-- Producer: Priority DM answered -> requester notification
CREATE OR REPLACE FUNCTION public.notify_on_priority_dm_answered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'answered' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    source_table,
    source_id,
    route_view,
    metadata,
    event_key
  )
  VALUES (
    NEW.requester_id,
    NEW.mentor_id,
    'priority_dm',
    'New Priority DM Reply',
    'Your mentor has replied to your priority message',
    'priority_dm_threads',
    NEW.id,
    'messages',
    jsonb_build_object(
      'status', NEW.status,
      'mentor_id', NEW.mentor_id
    ),
    'priority_dm.answered.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_priority_dm_answered ON public.priority_dm_threads;
CREATE TRIGGER trg_notify_priority_dm_answered
AFTER UPDATE OF status ON public.priority_dm_threads
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_priority_dm_answered();

-- Enable realtime updates
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

COMMENT ON TABLE public.notifications IS 'Persistent in-app notifications for mentors and students';
COMMENT ON COLUMN public.notifications.route_view IS 'Client view id used for click-through routing (dashboard tabs)';