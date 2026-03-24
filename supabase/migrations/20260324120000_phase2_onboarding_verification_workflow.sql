-- Phase 2 onboarding + verification workflow
-- Adds onboarding versioning, phase 2 state tracking, audit logs, and admin controls.

ALTER TABLE public.expert_profiles
ADD COLUMN IF NOT EXISTS onboarding_version TEXT,
ADD COLUMN IF NOT EXISTS phase2_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phase2_draft_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS phase2_liveness_photo_url TEXT,
ADD COLUMN IF NOT EXISTS phase2_intro_video_url TEXT,
ADD COLUMN IF NOT EXISTS phase2_proofs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS phase2_review_status TEXT,
ADD COLUMN IF NOT EXISTS phase2_review_notes TEXT,
ADD COLUMN IF NOT EXISTS phase2_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS phase2_attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phase2_max_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS phase2_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phase2_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phase2_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phase2_skipped_at TIMESTAMPTZ;

ALTER TABLE public.expert_profiles
ALTER COLUMN onboarding_version SET DEFAULT 'v1';

ALTER TABLE public.expert_profiles
ALTER COLUMN phase2_progress SET DEFAULT 0;

ALTER TABLE public.expert_profiles
ALTER COLUMN phase2_draft_data SET DEFAULT '{}'::jsonb;

ALTER TABLE public.expert_profiles
ALTER COLUMN phase2_proofs SET DEFAULT '[]'::jsonb;

ALTER TABLE public.expert_profiles
ALTER COLUMN phase2_attempt_count SET DEFAULT 0;

ALTER TABLE public.expert_profiles
ALTER COLUMN phase2_max_attempts SET DEFAULT 3;

ALTER TABLE public.expert_profiles
ALTER COLUMN phase2_locked SET DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'expert_profiles'
      AND constraint_name = 'expert_profiles_onboarding_version_check'
  ) THEN
    ALTER TABLE public.expert_profiles
      ADD CONSTRAINT expert_profiles_onboarding_version_check
      CHECK (onboarding_version IN ('v1', 'v2'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'expert_profiles'
      AND constraint_name = 'expert_profiles_phase2_review_status_check'
  ) THEN
    ALTER TABLE public.expert_profiles
      ADD CONSTRAINT expert_profiles_phase2_review_status_check
      CHECK (phase2_review_status IS NULL OR phase2_review_status IN ('draft', 'under_review', 'approved', 'rejected'));
  END IF;
END $$;

UPDATE public.expert_profiles
SET onboarding_version = 'v1'
WHERE onboarding_version IS NULL;

-- Ensure previously onboarded mentors remain fully verified (per product decision)
UPDATE public.expert_profiles
SET
  verification_status = 'verified',
  is_verified = TRUE,
  phase_2_complete = TRUE,
  phase2_review_status = COALESCE(phase2_review_status, 'approved')
WHERE onboarding_version = 'v1'
  AND phase_1_complete = TRUE
  AND (
    phase_2_complete = TRUE
    OR mentor_tier IN ('verified', 'top')
    OR is_verified = TRUE
  )
  AND COALESCE(verification_status, '') <> 'verified';

CREATE TABLE IF NOT EXISTS public.verification_review_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_profile_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_review_audit_logs_mentor
  ON public.verification_review_audit_logs(mentor_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_review_audit_logs_admin
  ON public.verification_review_audit_logs(admin_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.phase2_verification_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  checkpoint TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mentor_id, checkpoint)
);

CREATE INDEX IF NOT EXISTS idx_phase2_verification_reminder_logs_mentor
  ON public.phase2_verification_reminder_logs(mentor_id, sent_at DESC);

ALTER TABLE public.verification_review_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read verification audit logs" ON public.verification_review_audit_logs;
CREATE POLICY "Admins can read verification audit logs"
  ON public.verification_review_audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert verification audit logs" ON public.verification_review_audit_logs;
CREATE POLICY "System can insert verification audit logs"
  ON public.verification_review_audit_logs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() IS NULL);

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

  SELECT user_id, verification_status
  INTO mentor_user_id, previous_status
  FROM expert_profiles
  WHERE id = mentor_profile_id;

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
    user_id,
    verification_status,
    COALESCE(phase2_attempt_count, 0),
    GREATEST(COALESCE(phase2_max_attempts, 3), 1)
  INTO mentor_user_id, previous_status, current_attempt_count, current_max_attempts
  FROM expert_profiles
  WHERE id = mentor_profile_id;

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

  SELECT user_id, COALESCE(phase2_max_attempts, 3), COALESCE(phase2_attempt_count, 0)
  INTO mentor_user_id, old_max_attempts, current_attempt_count
  FROM expert_profiles
  WHERE id = mentor_profile_id;

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

GRANT EXECUTE ON FUNCTION public.admin_set_phase2_max_attempts(UUID, INTEGER, TEXT) TO authenticated;
