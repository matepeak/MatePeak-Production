-- Make booking duration validation service-aware.
-- oneOnOneSession must keep strict call duration limits.
-- Non-scheduled services are allowed to use 0+ duration values.

ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS valid_duration;

ALTER TABLE bookings
ADD CONSTRAINT valid_duration
CHECK (
  (
    session_type = 'oneOnOneSession'
    AND duration >= 15
    AND duration <= 240
  )
  OR (
    session_type <> 'oneOnOneSession'
    AND duration >= 0
    AND duration <= 240
  )
);

COMMENT ON CONSTRAINT valid_duration ON bookings IS
'For oneOnOneSession, duration must be 15-240 minutes; for other services, duration can be 0-240.';
