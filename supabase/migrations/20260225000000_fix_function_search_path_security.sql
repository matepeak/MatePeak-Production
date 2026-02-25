-- Fix Function Search Path Security Issues
-- This migration adds search_path protection to all functions to prevent search_path manipulation attacks
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- 1. Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_ip_address TEXT,
    p_action_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_max_requests INTEGER;
    v_time_window_minutes INTEGER;
    v_current_count INTEGER;
    v_cutoff_time TIMESTAMPTZ;
BEGIN
    -- Get rate limit config
    SELECT max_requests, time_window_minutes
    INTO v_max_requests, v_time_window_minutes
    FROM public.rate_limit_config
    WHERE action_type = p_action_type;

    -- If no config found, use default (allow)
    IF v_max_requests IS NULL THEN
        v_max_requests := 1000;
        v_time_window_minutes := 60;
    END IF;

    -- Calculate cutoff time
    v_cutoff_time := NOW() - (v_time_window_minutes || ' minutes')::INTERVAL;

    -- Count requests in time window (check both user_id and ip_address)
    SELECT COUNT(*)
    INTO v_current_count
    FROM public.rate_limit_log
    WHERE action_type = p_action_type
      AND created_at > v_cutoff_time
      AND (p_user_id IS NULL OR user_id = p_user_id OR ip_address = p_ip_address);

    -- Check if limit exceeded
    IF v_current_count >= v_max_requests THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'current_count', v_current_count,
            'max_requests', v_max_requests,
            'retry_after_minutes', v_time_window_minutes
        );
    END IF;

    -- Log the request
    INSERT INTO public.rate_limit_log (user_id, ip_address, action_type, created_at)
    VALUES (p_user_id, p_ip_address, p_action_type, NOW());

    RETURN jsonb_build_object(
        'allowed', true,
        'current_count', v_current_count + 1,
        'max_requests', v_max_requests
    );
END;
$$;

-- 2. Fix cleanup_rate_limit_logs function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.rate_limit_log
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 3. Fix get_rate_limit_status function
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(
    p_user_id UUID,
    p_action_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_max_requests INTEGER;
    v_time_window_minutes INTEGER;
    v_current_count INTEGER;
    v_cutoff_time TIMESTAMPTZ;
BEGIN
    -- Get rate limit config
    SELECT max_requests, time_window_minutes
    INTO v_max_requests, v_time_window_minutes
    FROM public.rate_limit_config
    WHERE action_type = p_action_type;

    IF v_max_requests IS NULL THEN
        v_max_requests := 1000;
        v_time_window_minutes := 60;
    END IF;

    v_cutoff_time := NOW() - (v_time_window_minutes || ' minutes')::INTERVAL;

    SELECT COUNT(*)
    INTO v_current_count
    FROM public.rate_limit_log
    WHERE action_type = p_action_type
      AND user_id = p_user_id
      AND created_at > v_cutoff_time;

    RETURN jsonb_build_object(
        'current_count', v_current_count,
        'max_requests', v_max_requests,
        'time_window_minutes', v_time_window_minutes,
        'remaining', GREATEST(0, v_max_requests - v_current_count)
    );
END;
$$;

-- 4. Fix sync_session_date function
CREATE OR REPLACE FUNCTION public.sync_session_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL THEN
    NEW.session_date := (NEW.scheduled_date::text || ' ' || NEW.scheduled_time::text)::timestamp with time zone;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Fix sync_student_id function
CREATE OR REPLACE FUNCTION public.sync_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    NEW.student_id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Fix update_expert_profiles_search_vector function
CREATE OR REPLACE FUNCTION public.update_expert_profiles_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.expertise_tags, ' '), '')), 'A');
  
  RETURN NEW;
END;
$$;

-- 7. Fix search_expert_profiles function
CREATE OR REPLACE FUNCTION public.search_expert_profiles(
  search_query text,
  match_limit int DEFAULT 20
)
RETURNS SETOF public.expert_profiles
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.expert_profiles
  WHERE search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', search_query)) DESC
  LIMIT match_limit;
END;
$$;

-- 8. Fix mark_review_requested function
CREATE OR REPLACE FUNCTION public.mark_review_requested(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.bookings
  SET review_requested = true,
      review_requested_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- 9. Fix get_sessions_ready_for_review function
CREATE OR REPLACE FUNCTION public.get_sessions_ready_for_review()
RETURNS TABLE (
  booking_id UUID,
  student_id UUID,
  expert_id UUID,
  session_date TIMESTAMPTZ,
  days_since_session INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.student_id,
    b.expert_id,
    b.session_date,
    EXTRACT(DAY FROM NOW() - b.session_date)::INTEGER as days_since_session
  FROM public.bookings b
  WHERE b.status = 'completed'
    AND b.review_requested = false
    AND b.session_date < NOW() - INTERVAL '1 day'
    AND b.session_date > NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews r 
      WHERE r.booking_id = b.id
    );
END;
$$;

-- 10. Fix get_mentor_rating_stats function
CREATE OR REPLACE FUNCTION public.get_mentor_rating_stats(p_mentor_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews BIGINT,
  rating_5_count BIGINT,
  rating_4_count BIGINT,
  rating_3_count BIGINT,
  rating_2_count BIGINT,
  rating_1_count BIGINT
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating), 2) as average_rating,
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE rating = 5) as rating_5_count,
    COUNT(*) FILTER (WHERE rating = 4) as rating_4_count,
    COUNT(*) FILTER (WHERE rating = 3) as rating_3_count,
    COUNT(*) FILTER (WHERE rating = 2) as rating_2_count,
    COUNT(*) FILTER (WHERE rating = 1) as rating_1_count
  FROM public.reviews
  WHERE expert_id = p_mentor_id;
END;
$$;

-- 11. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Fix update_booking_requests_updated_at function (if exists as separate function)
-- Note: This might be a trigger using update_updated_at_column, but adding for completeness
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_booking_requests_updated_at'
  ) THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.update_booking_requests_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = ''''
    AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$;
    ';
  END IF;
END $$;

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.check_rate_limit IS 'Rate limiting function with search_path protection to prevent SQL injection attacks';
COMMENT ON FUNCTION public.cleanup_rate_limit_logs IS 'Cleanup function with search_path protection';
COMMENT ON FUNCTION public.get_rate_limit_status IS 'Rate limit status function with search_path protection';
COMMENT ON FUNCTION public.sync_session_date IS 'Trigger function with search_path protection';
COMMENT ON FUNCTION public.sync_student_id IS 'Trigger function with search_path protection';
COMMENT ON FUNCTION public.update_expert_profiles_search_vector IS 'Search vector update function with search_path protection';
COMMENT ON FUNCTION public.search_expert_profiles IS 'Full-text search function with search_path protection';
COMMENT ON FUNCTION public.mark_review_requested IS 'Review request function with search_path protection';
COMMENT ON FUNCTION public.get_sessions_ready_for_review IS 'Review-ready sessions function with search_path protection';
COMMENT ON FUNCTION public.get_mentor_rating_stats IS 'Mentor rating statistics function with search_path protection';
COMMENT ON FUNCTION public.update_updated_at_column IS 'Timestamp update function with search_path protection';
