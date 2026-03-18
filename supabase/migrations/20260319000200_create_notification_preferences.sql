-- Notification preferences + producer gating

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  booking_lifecycle_enabled BOOLEAN NOT NULL DEFAULT true,
  time_requests_enabled BOOLEAN NOT NULL DEFAULT true,
  priority_dm_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at
  ON public.notification_preferences(updated_at DESC);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_notification_preferences_updated_at();

-- Optional seed so existing users have explicit rows
INSERT INTO public.notification_preferences (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notification_preferences np
  WHERE np.user_id = p.id
);

-- Helper used by producer functions
CREATE OR REPLACE FUNCTION public.is_notification_channel_enabled(
  p_user_id UUID,
  p_channel TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_pref public.notification_preferences%ROWTYPE;
BEGIN
  SELECT * INTO v_pref
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- Default on if row does not exist
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF NOT v_pref.in_app_enabled THEN
    RETURN false;
  END IF;

  IF p_channel = 'booking_lifecycle' THEN
    RETURN v_pref.booking_lifecycle_enabled;
  ELSIF p_channel = 'time_requests' THEN
    RETURN v_pref.time_requests_enabled;
  ELSIF p_channel = 'priority_dm' THEN
    RETURN v_pref.priority_dm_enabled;
  END IF;

  RETURN true;
END;
$$;

-- Replace producer functions with preference checks
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

  IF NOT public.is_notification_channel_enabled(NEW.expert_id, 'booking_lifecycle') THEN
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
    public.format_session_type_label(NEW.session_type),
    'bookings',
    NEW.id,
    'sessions',
    jsonb_build_object('session_type', NEW.session_type, 'status', NEW.status),
    'booking.created.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

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

  IF NOT public.is_notification_channel_enabled(NEW.user_id, 'booking_lifecycle') THEN
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
    public.format_session_type_label(NEW.session_type),
    'bookings',
    NEW.id,
    'sessions',
    jsonb_build_object('session_type', NEW.session_type, 'status', NEW.status),
    'booking.status.' || NEW.status || '.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_booking_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_notification_channel_enabled(NEW.mentor_id, 'time_requests') THEN
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

  IF NOT public.is_notification_channel_enabled(NEW.mentee_id, 'time_requests') THEN
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
    jsonb_build_object('status', NEW.status, 'mentor_response', NEW.mentor_response),
    'booking_request.status.' || NEW.status || '.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_priority_dm_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_notification_channel_enabled(NEW.mentor_id, 'priority_dm') THEN
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
    NEW.mentor_id,
    NEW.requester_id,
    'priority_dm',
    'New Priority DM Message',
    left(NEW.message_text, 120),
    'priority_dm_threads',
    NEW.id,
    'messages',
    jsonb_build_object('status', NEW.status, 'requester_name', NEW.requester_name),
    'priority_dm.created.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

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

  IF NOT public.is_notification_channel_enabled(NEW.requester_id, 'priority_dm') THEN
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
    jsonb_build_object('status', NEW.status, 'mentor_id', NEW.mentor_id),
    'priority_dm.answered.' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.notification_preferences IS 'Per-user channel controls for in-app/email/push notifications';