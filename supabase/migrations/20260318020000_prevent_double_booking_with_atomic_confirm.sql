-- Prevent double-booking for confirmed one-on-one sessions using a DB-level overlap constraint.
-- Also add an atomic payment-confirmation function that safely handles slot conflicts.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Parse HH:MM / HH:MM:SS safely to total minutes using immutable operations only.
CREATE OR REPLACE FUNCTION public.time_text_to_minutes(p_time TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT (split_part(p_time, ':', 1)::INTEGER * 60)
       + split_part(p_time, ':', 2)::INTEGER;
$$;

-- Cleanup existing overlapping confirmed one-on-one bookings (keep earliest, cancel later ones)
WITH one_on_one AS (
  SELECT
    b.id,
    b.expert_id,
    b.created_at,
    tsrange(
      (b.scheduled_date::timestamp + make_interval(mins => public.time_text_to_minutes(b.scheduled_time))),
      (b.scheduled_date::timestamp + make_interval(mins => public.time_text_to_minutes(b.scheduled_time) + b.duration)),
      '[)'
    ) AS slot_range
  FROM public.bookings b
  WHERE b.session_type = 'oneOnOneSession'
    AND b.status = 'confirmed'
),
conflicted_later AS (
  SELECT DISTINCT later.id
  FROM one_on_one earlier
  JOIN one_on_one later
    ON earlier.expert_id = later.expert_id
   AND earlier.id <> later.id
   AND earlier.slot_range && later.slot_range
   AND (earlier.created_at < later.created_at OR (earlier.created_at = later.created_at AND earlier.id::text < later.id::text))
)
UPDATE public.bookings b
SET
  status = 'cancelled',
  payment_status = CASE
    WHEN COALESCE(b.total_amount, 0) > 0 THEN 'refunded'
    ELSE COALESCE(b.payment_status, 'pending')
  END,
  updated_at = now()
WHERE b.id IN (SELECT id FROM conflicted_later)
  AND b.status = 'confirmed';

-- Enforce no overlap for confirmed one-on-one sessions of the same mentor.
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_no_overlap_confirmed_one_on_one;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_no_overlap_confirmed_one_on_one
EXCLUDE USING gist (
  expert_id WITH =,
  tsrange(
    (scheduled_date::timestamp + make_interval(mins => public.time_text_to_minutes(scheduled_time))),
    (scheduled_date::timestamp + make_interval(mins => public.time_text_to_minutes(scheduled_time) + duration)),
    '[)'
  ) WITH &&
)
WHERE (
  session_type = 'oneOnOneSession'
  AND status = 'confirmed'
);

COMMENT ON CONSTRAINT bookings_no_overlap_confirmed_one_on_one ON public.bookings IS
'Prevents overlapping confirmed oneOnOneSession bookings for the same mentor.';

-- Atomic confirmation after successful payment.
-- Uses row lock + single transactional update and handles overlap violation deterministically.
CREATE OR REPLACE FUNCTION public.confirm_booking_after_payment(
  p_booking_id UUID,
  p_payment_id TEXT DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  code TEXT,
  message TEXT,
  booking_id UUID,
  booking_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found', 'Booking not found', p_booking_id, NULL::TEXT;
    RETURN;
  END IF;

  IF v_booking.status = 'confirmed'
     AND COALESCE(v_booking.payment_status, 'pending') IN ('paid', 'completed', 'free') THEN
    RETURN QUERY SELECT true, 'already_confirmed', 'Booking already confirmed', p_booking_id, v_booking.status;
    RETURN;
  END IF;

  IF v_booking.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'invalid_state', 'Only pending bookings can be confirmed', p_booking_id, v_booking.status;
    RETURN;
  END IF;

  BEGIN
    UPDATE public.bookings
    SET
      status = 'confirmed',
      payment_status = CASE
        WHEN COALESCE(total_amount, 0) > 0 THEN 'paid'
        ELSE 'free'
      END,
      payment_id = COALESCE(p_payment_id, payment_id),
      message = CASE
        WHEN p_order_id IS NOT NULL
             AND COALESCE(message, '') NOT LIKE '%Order ID:%'
          THEN CONCAT(TRIM(COALESCE(message, '')), E'\n\nOrder ID: ', p_order_id)
        ELSE message
      END,
      updated_at = now()
    WHERE id = p_booking_id;

    RETURN QUERY SELECT true, 'confirmed', 'Booking confirmed', p_booking_id, 'confirmed';
    RETURN;
  EXCEPTION
    WHEN exclusion_violation THEN
      UPDATE public.bookings
      SET
        status = 'cancelled',
        payment_status = CASE
          WHEN COALESCE(total_amount, 0) > 0 THEN 'refunded'
          ELSE COALESCE(payment_status, 'pending')
        END,
        updated_at = now()
      WHERE id = p_booking_id
        AND status = 'pending';

      RETURN QUERY SELECT false, 'slot_conflict', 'Slot already booked by another user', p_booking_id, 'cancelled';
      RETURN;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_booking_after_payment(UUID, TEXT, TEXT) TO authenticated, service_role;
