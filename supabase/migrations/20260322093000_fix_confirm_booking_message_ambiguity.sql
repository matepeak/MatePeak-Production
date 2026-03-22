-- Fix ambiguous "message" reference in confirm_booking_after_payment.
-- In PL/pgSQL RETURNS TABLE functions, output column names are variables,
-- so unqualified "message" inside UPDATE can become ambiguous.

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
    UPDATE public.bookings AS b
    SET
      status = 'confirmed',
      payment_status = CASE
        WHEN COALESCE(b.total_amount, 0) > 0 THEN 'paid'
        ELSE 'free'
      END,
      payment_id = COALESCE(p_payment_id, b.payment_id),
      message = CASE
        WHEN p_order_id IS NOT NULL
             AND COALESCE(b.message, '') NOT LIKE '%Order ID:%'
          THEN CONCAT(TRIM(COALESCE(b.message, '')), E'\n\nOrder ID: ', p_order_id)
        ELSE b.message
      END,
      updated_at = now()
    WHERE b.id = p_booking_id;

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
