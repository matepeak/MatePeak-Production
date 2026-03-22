-- One-time backfill for recent notifications
-- Safe to run multiple times due to event_key unique index

-- 1) Recent pending bookings -> mentor
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
  event_key,
  created_at,
  updated_at
)
SELECT
  b.expert_id,
  b.user_id,
  'booking',
  'New Booking Request',
  public.format_session_type_label(b.session_type),
  'bookings',
  b.id,
  'sessions',
  jsonb_build_object('session_type', b.session_type, 'status', b.status),
  'booking.created.' || b.id::text,
  b.created_at,
  now()
FROM public.bookings b
WHERE b.status = 'pending'
  AND b.created_at >= now() - interval '30 days'
  AND public.is_notification_channel_enabled(b.expert_id, 'booking_lifecycle')
ON CONFLICT DO NOTHING;

-- 2) Recent confirmed/cancelled bookings -> student
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
  event_key,
  created_at,
  updated_at
)
SELECT
  b.user_id,
  b.expert_id,
  'booking',
  CASE WHEN b.status = 'confirmed' THEN 'Booking Confirmed' ELSE 'Booking Cancelled' END,
  public.format_session_type_label(b.session_type),
  'bookings',
  b.id,
  'sessions',
  jsonb_build_object('session_type', b.session_type, 'status', b.status),
  'booking.status.' || b.status || '.' || b.id::text,
  coalesce(b.updated_at, b.created_at),
  now()
FROM public.bookings b
WHERE b.status IN ('confirmed', 'cancelled')
  AND coalesce(b.updated_at, b.created_at) >= now() - interval '30 days'
  AND public.is_notification_channel_enabled(b.user_id, 'booking_lifecycle')
ON CONFLICT DO NOTHING;

-- 3) Recent booking requests created -> mentor
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
  event_key,
  created_at,
  updated_at
)
SELECT
  br.mentor_id,
  br.mentee_id,
  'booking_request',
  'New Time Request',
  to_char(br.requested_date, 'Mon DD') || ' ' || br.requested_start_time || ' - ' || br.requested_end_time,
  'booking_requests',
  br.id,
  'requests',
  jsonb_build_object(
    'status', br.status,
    'requested_date', br.requested_date,
    'requested_start_time', br.requested_start_time,
    'requested_end_time', br.requested_end_time
  ),
  'booking_request.created.' || br.id::text,
  br.created_at,
  now()
FROM public.booking_requests br
WHERE br.created_at >= now() - interval '30 days'
  AND public.is_notification_channel_enabled(br.mentor_id, 'time_requests')
ON CONFLICT DO NOTHING;

-- 4) Recent approved/declined booking requests -> mentee
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
  event_key,
  created_at,
  updated_at
)
SELECT
  br.mentee_id,
  br.mentor_id,
  'booking_request',
  CASE WHEN br.status = 'approved' THEN 'Time Request Approved' ELSE 'Time Request Declined' END,
  coalesce(br.mentor_response, 'Your mentor responded to your time request'),
  'booking_requests',
  br.id,
  'time-request',
  jsonb_build_object('status', br.status, 'mentor_response', br.mentor_response),
  'booking_request.status.' || br.status || '.' || br.id::text,
  coalesce(br.updated_at, br.created_at),
  now()
FROM public.booking_requests br
WHERE br.status IN ('approved', 'declined')
  AND coalesce(br.updated_at, br.created_at) >= now() - interval '30 days'
  AND public.is_notification_channel_enabled(br.mentee_id, 'time_requests')
ON CONFLICT DO NOTHING;

-- 5) Recent priority DM creations -> mentor
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
  event_key,
  created_at,
  updated_at
)
SELECT
  t.mentor_id,
  t.requester_id,
  'priority_dm',
  'New Priority DM Message',
  left(t.message_text, 120),
  'priority_dm_threads',
  t.id,
  'messages',
  jsonb_build_object('status', t.status, 'requester_name', t.requester_name),
  'priority_dm.created.' || t.id::text,
  t.created_at,
  now()
FROM public.priority_dm_threads t
WHERE t.created_at >= now() - interval '30 days'
  AND public.is_notification_channel_enabled(t.mentor_id, 'priority_dm')
ON CONFLICT DO NOTHING;

-- 6) Recent priority DM replies answered -> requester
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
  event_key,
  created_at,
  updated_at
)
SELECT
  t.requester_id,
  t.mentor_id,
  'priority_dm',
  'New Priority DM Reply',
  'Your mentor has replied to your priority message',
  'priority_dm_threads',
  t.id,
  'messages',
  jsonb_build_object('status', t.status, 'mentor_id', t.mentor_id),
  'priority_dm.answered.' || t.id::text,
  coalesce(t.answered_at, t.updated_at, t.created_at),
  now()
FROM public.priority_dm_threads t
WHERE t.status IN ('answered', 'read_by_requester')
  AND coalesce(t.answered_at, t.updated_at, t.created_at) >= now() - interval '30 days'
  AND public.is_notification_channel_enabled(t.requester_id, 'priority_dm')
ON CONFLICT DO NOTHING;