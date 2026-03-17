-- Migration to enhance bookings table for new booking system
-- Date: 2025-11-01
-- NOTE (March 2026): Session type 'chatAdvice' referenced in this file has been renamed to 'priorityDm'
-- See migration 20260317000100_rename_chatadvice_to_prioritydm.sql for the rename operation.
-- NOTE (March 2026): Legacy session type 'notes' was later consolidated into 'digitalProducts'
-- See migration 20260317000200_remove_notes_service_type.sql for the consolidation.

-- Add any missing columns to bookings table
DO $$ 
BEGIN
    -- Add session_time column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'session_time'
    ) THEN
        ALTER TABLE bookings ADD COLUMN session_time TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_expert_id ON bookings(expert_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_expert_date 
ON bookings(expert_id, scheduled_date) 
WHERE status IN ('pending', 'confirmed');

-- Update RLS policies if needed
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Mentors can view bookings made to them" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own pending bookings" ON bookings;

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = expert_id);

CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending bookings"
ON bookings FOR UPDATE
USING (
  auth.uid() = user_id 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
);

CREATE POLICY "Mentors can update bookings made to them"
ON bookings FOR UPDATE
USING (auth.uid() = expert_id)
WITH CHECK (auth.uid() = expert_id);

-- Add comments for documentation
COMMENT ON TABLE bookings IS 'Stores all booking/session records between students and mentors';
COMMENT ON COLUMN bookings.session_type IS 'Legacy session type values from this point in history. Current supported values are oneOnOneSession, priorityDm, digitalProducts after follow-up migrations.';
COMMENT ON COLUMN bookings.status IS 'Booking status: pending (awaiting confirmation), confirmed, completed, cancelled';
COMMENT ON COLUMN bookings.scheduled_date IS 'Date of the scheduled session (YYYY-MM-DD)';
COMMENT ON COLUMN bookings.scheduled_time IS 'Time of the scheduled session (HH:MM format)';
COMMENT ON COLUMN bookings.duration IS 'Session duration in minutes';
COMMENT ON COLUMN bookings.total_amount IS 'Total amount paid for the session including add-ons';
COMMENT ON COLUMN bookings.message IS 'User message/purpose for the session';

-- Create function to prevent double booking
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a conflicting booking
  IF EXISTS (
    SELECT 1
    FROM bookings
    WHERE expert_id = NEW.expert_id
    AND scheduled_date = NEW.scheduled_date
    AND status IN ('pending', 'confirmed')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- Check for time overlap
      (NEW.scheduled_time >= scheduled_time 
       AND NEW.scheduled_time < (scheduled_time::time + (duration || ' minutes')::interval)::text)
      OR
      ((NEW.scheduled_time::time + (NEW.duration || ' minutes')::interval)::text > scheduled_time
       AND NEW.scheduled_time < scheduled_time)
    )
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for double booking prevention
DROP TRIGGER IF EXISTS prevent_double_booking ON bookings;
CREATE TRIGGER prevent_double_booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_conflict();

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bookings_timestamp ON bookings;
CREATE TRIGGER update_bookings_timestamp
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();

-- Grant appropriate permissions
GRANT SELECT, INSERT ON bookings TO authenticated;
GRANT UPDATE (status, updated_at) ON bookings TO authenticated;

-- Add helpful views for common queries

-- View for upcoming bookings
CREATE OR REPLACE VIEW upcoming_bookings AS
SELECT 
  b.*,
  ep.full_name as mentor_name,
  ep.profile_picture_url as mentor_image,
  ep.username as mentor_username,
  p.full_name as student_name,
  p.email as student_email
FROM bookings b
JOIN expert_profiles ep ON b.expert_id = ep.id
JOIN profiles p ON b.user_id = p.id
WHERE b.scheduled_date >= CURRENT_DATE
AND b.status IN ('pending', 'confirmed')
ORDER BY b.scheduled_date, b.scheduled_time;

-- View for completed bookings (for reviews)
CREATE OR REPLACE VIEW completed_bookings AS
SELECT 
  b.*,
  ep.full_name as mentor_name,
  ep.profile_picture_url as mentor_image,
  ep.username as mentor_username,
  p.full_name as student_name,
  p.email as student_email
FROM bookings b
JOIN expert_profiles ep ON b.expert_id = ep.id
JOIN profiles p ON b.user_id = p.id
WHERE b.status = 'completed'
ORDER BY b.scheduled_date DESC, b.scheduled_time DESC;

-- Grant select on views
GRANT SELECT ON upcoming_bookings TO authenticated;
GRANT SELECT ON completed_bookings TO authenticated;

-- Add RLS on views
ALTER VIEW upcoming_bookings SET (security_invoker = on);
ALTER VIEW completed_bookings SET (security_invoker = on);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Bookings table migration completed successfully';
END $$;
