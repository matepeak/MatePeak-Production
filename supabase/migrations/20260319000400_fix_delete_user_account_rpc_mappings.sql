-- Fix delete_user_account RPC mappings to current schema
-- - Avoid outdated field names (mentor_id/user_id on notifications)
-- - Avoid parameter shadowing bugs
-- - Guard optional tables/columns for safer execution across environments

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF current_user_id <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own account';
  END IF;

  -- session_messages (schema variants supported)
  IF to_regclass('public.session_messages') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'session_messages' AND column_name = 'sender_id'
    ) THEN
      EXECUTE 'DELETE FROM public.session_messages WHERE sender_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'session_messages' AND column_name = 'booking_id'
    ) THEN
      EXECUTE '
        DELETE FROM public.session_messages
        WHERE booking_id IN (
          SELECT id
          FROM public.bookings
          WHERE user_id = $1 OR expert_id = $1
        )'
      USING p_user_id;
    END IF;
  END IF;

  -- messages (if present)
  IF to_regclass('public.messages') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
    ) THEN
      EXECUTE 'DELETE FROM public.messages WHERE sender_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id'
    ) THEN
      EXECUTE 'DELETE FROM public.messages WHERE receiver_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- student_notes
  IF to_regclass('public.student_notes') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'student_notes' AND column_name = 'expert_id'
    ) THEN
      EXECUTE 'DELETE FROM public.student_notes WHERE expert_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'student_notes' AND column_name = 'student_id'
    ) THEN
      EXECUTE 'DELETE FROM public.student_notes WHERE student_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- reviews
  IF to_regclass('public.reviews') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'expert_id'
    ) THEN
      EXECUTE 'DELETE FROM public.reviews WHERE expert_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'DELETE FROM public.reviews WHERE user_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- withdrawal_requests
  IF to_regclass('public.withdrawal_requests') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'withdrawal_requests' AND column_name = 'mentor_id'
  ) THEN
    EXECUTE 'DELETE FROM public.withdrawal_requests WHERE mentor_id = $1'
    USING p_user_id;
  END IF;

  -- mentor_wallets
  IF to_regclass('public.mentor_wallets') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_wallets' AND column_name = 'mentor_id'
  ) THEN
    EXECUTE 'DELETE FROM public.mentor_wallets WHERE mentor_id = $1'
    USING p_user_id;
  END IF;

  -- booking_requests (custom time request flow)
  IF to_regclass('public.booking_requests') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'mentor_id'
    ) THEN
      EXECUTE 'DELETE FROM public.booking_requests WHERE mentor_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'mentee_id'
    ) THEN
      EXECUTE 'DELETE FROM public.booking_requests WHERE mentee_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- custom_time_requests (legacy optional)
  IF to_regclass('public.custom_time_requests') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_time_requests' AND column_name = 'mentor_id'
    ) THEN
      EXECUTE 'DELETE FROM public.custom_time_requests WHERE mentor_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_time_requests' AND column_name = 'mentee_id'
    ) THEN
      EXECUTE 'DELETE FROM public.custom_time_requests WHERE mentee_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- priority DM
  IF to_regclass('public.priority_dm_events') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'priority_dm_events' AND column_name = 'actor_id'
  ) THEN
    EXECUTE 'DELETE FROM public.priority_dm_events WHERE actor_id = $1'
    USING p_user_id;
  END IF;

  IF to_regclass('public.priority_dm_threads') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'priority_dm_threads' AND column_name = 'mentor_id'
    ) THEN
      EXECUTE 'DELETE FROM public.priority_dm_threads WHERE mentor_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'priority_dm_threads' AND column_name = 'requester_id'
    ) THEN
      EXECUTE 'DELETE FROM public.priority_dm_threads WHERE requester_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- bookings
  IF to_regclass('public.bookings') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'expert_id'
    ) THEN
      EXECUTE 'DELETE FROM public.bookings WHERE expert_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'DELETE FROM public.bookings WHERE user_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- notification preferences + notifications
  IF to_regclass('public.notification_preferences') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'DELETE FROM public.notification_preferences WHERE user_id = $1'
    USING p_user_id;
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id'
    ) THEN
      EXECUTE 'DELETE FROM public.notifications WHERE recipient_id = $1'
      USING p_user_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'actor_id'
    ) THEN
      EXECUTE 'DELETE FROM public.notifications WHERE actor_id = $1'
      USING p_user_id;
    END IF;
  END IF;

  -- core profiles
  IF to_regclass('public.expert_profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.expert_profiles WHERE id = $1'
    USING p_user_id;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.profiles WHERE id = $1'
    USING p_user_id;
  END IF;

  result := json_build_object(
    'success', true,
    'message', 'User data deleted successfully',
    'user_id', p_user_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting user account: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_user_account(UUID) IS
'Securely deletes a user account and associated relational data using current schema-safe mappings.';