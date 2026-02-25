-- Performance Optimization: Add Indexes for Slow Queries
-- This migration adds indexes to improve query performance

-- 1. Add indexes on expert_profiles for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_expert_profiles_categories_gin 
  ON expert_profiles USING GIN(categories);

CREATE INDEX IF NOT EXISTS idx_expert_profiles_expertise_gin 
  ON expert_profiles USING GIN(expertise_tags);

CREATE INDEX IF NOT EXISTS idx_expert_profiles_created_desc 
  ON expert_profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expert_profiles_onboarding_completed 
  ON expert_profiles(onboarding_completed) 
  WHERE onboarding_completed = true;

CREATE INDEX IF NOT EXISTS idx_expert_profiles_username 
  ON expert_profiles(username) 
  WHERE username IS NOT NULL;

-- 2. Add indexes on bookings for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_student_id_status 
  ON bookings(student_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_expert_id_status 
  ON bookings(expert_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_session_date_desc 
  ON bookings(session_date DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_review_requested 
  ON bookings(review_requested, session_date) 
  WHERE status = 'completed' AND review_requested = false;

-- 3. Add indexes on reviews for performance
CREATE INDEX IF NOT EXISTS idx_reviews_expert_id_rating 
  ON reviews(expert_id, rating);

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id 
  ON reviews(booking_id);

-- 4. Add indexes on rate_limit_log for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_action_time 
  ON rate_limit_log(user_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_ip_action_time 
  ON rate_limit_log(ip_address, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_cleanup 
  ON rate_limit_log(created_at) 
  WHERE created_at < NOW() - INTERVAL '7 days';

-- 5. Add indexes on booking_requests for performance
CREATE INDEX IF NOT EXISTS idx_booking_requests_mentee_status 
  ON booking_requests(mentee_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_requests_mentor_status 
  ON booking_requests(mentor_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_requests_created_desc 
  ON booking_requests(created_at DESC);

-- 6. Add full-text search index (if not exists)
CREATE INDEX IF NOT EXISTS idx_expert_profiles_search_vector 
  ON expert_profiles USING GIN(search_vector);

-- 7. Add index on profiles for avatar lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url 
  ON profiles(id, avatar_url) 
  WHERE avatar_url IS NOT NULL;

-- Add comments explaining the indexes
COMMENT ON INDEX idx_expert_profiles_categories_gin IS 'GIN index for fast array containment queries on categories';
COMMENT ON INDEX idx_expert_profiles_expertise_gin IS 'GIN index for fast array containment queries on expertise_tags';
COMMENT ON INDEX idx_expert_profiles_created_desc IS 'Index for fetching newest mentors efficiently';
COMMENT ON INDEX idx_expert_profiles_onboarding_completed IS 'Partial index for active mentors only';
COMMENT ON INDEX idx_bookings_student_id_status IS 'Composite index for student dashboard queries';
COMMENT ON INDEX idx_bookings_expert_id_status IS 'Composite index for mentor dashboard queries';
COMMENT ON INDEX idx_reviews_expert_id_rating IS 'Composite index for calculating mentor ratings';
COMMENT ON INDEX idx_rate_limit_log_cleanup IS 'Partial index to speed up cleanup operations';

-- Analyze tables to update statistics
ANALYZE expert_profiles;
ANALYZE bookings;
ANALYZE reviews;
ANALYZE rate_limit_log;
ANALYZE booking_requests;
ANALYZE profiles;
