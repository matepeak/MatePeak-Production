-- Fix admin mentor functions for schemas where expert_profiles has no user_id column.
-- In this project, expert_profiles.id maps to auth user id.

CREATE OR REPLACE FUNCTION public.admin_verify_mentor(
  mentor_profile_id UUID,
  verification_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  mentor_user_id UUID;
  previous_status TEXT;
  result JSONB;
BEGIN
  admin_user_id := auth.uid();

  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT id, verification_status
  INTO mentor_user_id, previous_status
  FROM expert_profiles
  WHERE id = mentor_profile_id;

  IF mentor_user_id IS NULL THEN
    RAISE EXCEPTION 'Mentor profile not found';
  END IF;

  UPDATE expert_profiles
  SET
    is_verified = TRUE,
    profile_status = 'active',
    verification_status = 'verified',
    verification_date = NOW(),
    mentor_tier = CASE WHEN mentor_tier = 'top' THEN mentor_tier ELSE 'verified' END,
    max_weekly_bookings = 999,
    phase_2_complete = TRUE,
    phase2_progress = 4,
    phase2_review_status = 'approved',
    phase2_review_notes = verification_notes,
    phase2_rejection_reason = NULL,
    verification_rejection_reason = NULL,
    phase2_reviewed_at = NOW(),
    phase2_locked = FALSE,
    updated_at = NOW()
  WHERE id = mentor_profile_id;

  INSERT INTO admin_actions (
    admin_id,
    action_type,
    target_user_id,
    target_resource_id,
    target_resource_type,
    details
  ) VALUES (
    admin_user_id,
    'verify_mentor',
    mentor_user_id,
    mentor_profile_id,
    'expert_profile',
    jsonb_build_object('notes', verification_notes)
  );

  INSERT INTO verification_review_audit_logs (
    mentor_profile_id,
    admin_id,
    action,
    from_status,
    to_status,
    notes,
    metadata
  ) VALUES (
    mentor_profile_id,
    admin_user_id,
    'approved',
    previous_status,
    'verified',
    verification_notes,
    jsonb_build_object('max_weekly_bookings', 999)
  );

  result := jsonb_build_object(
    'success', true,
    'message', 'Mentor verified successfully'
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_mentor(
  mentor_profile_id UUID,
  rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  mentor_user_id UUID;
  previous_status TEXT;
  current_attempt_count INTEGER;
  current_max_attempts INTEGER;
  next_attempt_count INTEGER;
  is_locked BOOLEAN;
  next_status TEXT;
  result JSONB;
BEGIN
  admin_user_id := auth.uid();

  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT
    id,
    verification_status,
    COALESCE(phase2_attempt_count, 0),
    GREATEST(COALESCE(phase2_max_attempts, 3), 1)
  INTO mentor_user_id, previous_status, current_attempt_count, current_max_attempts
  FROM expert_profiles
  WHERE id = mentor_profile_id;

  IF mentor_user_id IS NULL THEN
    RAISE EXCEPTION 'Mentor profile not found';
  END IF;

  next_attempt_count := current_attempt_count + 1;
  is_locked := next_attempt_count >= current_max_attempts;
  next_status := CASE WHEN is_locked THEN 'failed' ELSE 'pending' END;

  UPDATE expert_profiles
  SET
    is_verified = FALSE,
    verification_status = next_status,
    verification_rejection_reason = rejection_reason,
    phase_2_complete = FALSE,
    phase2_review_status = 'rejected',
    phase2_review_notes = NULL,
    phase2_rejection_reason = rejection_reason,
    phase2_reviewed_at = NOW(),
    phase2_submitted_at = NULL,
    phase2_attempt_count = next_attempt_count,
    phase2_locked = is_locked,
    updated_at = NOW()
  WHERE id = mentor_profile_id;

  INSERT INTO admin_actions (
    admin_id,
    action_type,
    target_user_id,
    target_resource_id,
    target_resource_type,
    reason,
    details
  ) VALUES (
    admin_user_id,
    'reject_mentor',
    mentor_user_id,
    mentor_profile_id,
    'expert_profile',
    rejection_reason,
    jsonb_build_object(
      'attempt_count', next_attempt_count,
      'max_attempts', current_max_attempts,
      'locked', is_locked
    )
  );

  INSERT INTO verification_review_audit_logs (
    mentor_profile_id,
    admin_id,
    action,
    from_status,
    to_status,
    notes,
    metadata
  ) VALUES (
    mentor_profile_id,
    admin_user_id,
    'rejected',
    previous_status,
    next_status,
    rejection_reason,
    jsonb_build_object(
      'attempt_count', next_attempt_count,
      'max_attempts', current_max_attempts,
      'locked', is_locked
    )
  );

  result := jsonb_build_object(
    'success', true,
    'message', CASE WHEN is_locked THEN 'Verification rejected and mentor locked after maximum attempts' ELSE 'Mentor verification rejected' END,
    'locked', is_locked,
    'attempt_count', next_attempt_count,
    'max_attempts', current_max_attempts
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_phase2_max_attempts(
  mentor_profile_id UUID,
  max_attempts INTEGER,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  mentor_user_id UUID;
  old_max_attempts INTEGER;
  current_attempt_count INTEGER;
  effective_max_attempts INTEGER;
  result JSONB;
BEGIN
  admin_user_id := auth.uid();

  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  effective_max_attempts := GREATEST(COALESCE(max_attempts, 3), 1);

  SELECT id, COALESCE(phase2_max_attempts, 3), COALESCE(phase2_attempt_count, 0)
  INTO mentor_user_id, old_max_attempts, current_attempt_count
  FROM expert_profiles
  WHERE id = mentor_profile_id;

  IF mentor_user_id IS NULL THEN
    RAISE EXCEPTION 'Mentor profile not found';
  END IF;

  UPDATE expert_profiles
  SET
    phase2_max_attempts = effective_max_attempts,
    phase2_locked = current_attempt_count >= effective_max_attempts,
    updated_at = NOW()
  WHERE id = mentor_profile_id;

  INSERT INTO admin_actions (
    admin_id,
    action_type,
    target_user_id,
    target_resource_id,
    target_resource_type,
    details
  ) VALUES (
    admin_user_id,
    'set_phase2_max_attempts',
    mentor_user_id,
    mentor_profile_id,
    'expert_profile',
    jsonb_build_object(
      'old_max_attempts', old_max_attempts,
      'new_max_attempts', effective_max_attempts,
      'notes', notes
    )
  );

  INSERT INTO verification_review_audit_logs (
    mentor_profile_id,
    admin_id,
    action,
    notes,
    metadata
  ) VALUES (
    mentor_profile_id,
    admin_user_id,
    'max_attempts_updated',
    notes,
    jsonb_build_object(
      'old_max_attempts', old_max_attempts,
      'new_max_attempts', effective_max_attempts
    )
  );

  result := jsonb_build_object(
    'success', true,
    'message', 'Maximum attempts updated successfully',
    'max_attempts', effective_max_attempts
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_mentor(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_mentor(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_phase2_max_attempts(UUID, INTEGER, TEXT) TO authenticated;
