-- =====================================================
-- Admin System Implementation
-- =====================================================
-- This migration adds comprehensive admin functionality including:
-- - Admin audit logging
-- - User suspension/ban system
-- - Mentor verification functions
-- - Withdrawal request management
-- - Review moderation
-- =====================================================

-- =====================================================
-- 1. ADMIN AUDIT LOG
-- =====================================================
-- Track all admin actions for accountability
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'verify_mentor', 'reject_mentor', 'suspend_user', 'unsuspend_user', 
    'ban_user', 'approve_withdrawal', 'reject_withdrawal', 
    'delete_review', 'flag_review', 'update_profile_status'
  )),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resource_id UUID, -- Can reference any table (booking, review, etc.)
  target_resource_type TEXT, -- 'expert_profile', 'review', 'withdrawal_request', etc.
  details JSONB, -- Additional context
  reason TEXT, -- Admin's reason for action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);

COMMENT ON TABLE admin_actions IS 'Audit log of all administrative actions';

-- =====================================================
-- 2. USER SUSPENSION SYSTEM
-- =====================================================
-- Add suspension fields to profiles table (if not exists)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended) 
WHERE is_suspended = true;

COMMENT ON COLUMN public.profiles.is_suspended IS 'Whether the user account is suspended';
COMMENT ON COLUMN public.profiles.suspension_reason IS 'Reason for account suspension';
COMMENT ON COLUMN public.profiles.suspended_at IS 'When the account was suspended';
COMMENT ON COLUMN public.profiles.suspended_by IS 'Admin who suspended the account';

-- =====================================================
-- 3. WITHDRAWAL REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  account_details JSONB, -- Bank account details
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  transaction_id TEXT, -- External payment system transaction ID
  notes TEXT -- Admin notes
);

CREATE INDEX idx_withdrawal_requests_mentor_id ON withdrawal_requests(mentor_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_requested_at ON withdrawal_requests(requested_at DESC);

COMMENT ON TABLE withdrawal_requests IS 'Mentor withdrawal requests requiring admin approval';

-- =====================================================
-- 4. MENTOR WALLET TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS mentor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance NUMERIC(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
  total_earned NUMERIC(10, 2) DEFAULT 0.00,
  total_withdrawn NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_mentor_wallets_mentor_id ON mentor_wallets(mentor_id);

COMMENT ON TABLE mentor_wallets IS 'Mentor earnings wallet (90% of session fees)';

-- =====================================================
-- 5. REVIEW MODERATION FLAGS
-- =====================================================
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_reviews_is_flagged ON public.reviews(is_flagged) 
WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON public.reviews(is_hidden) 
WHERE is_hidden = true;

COMMENT ON COLUMN public.reviews.is_flagged IS 'Whether the review has been flagged for moderation';
COMMENT ON COLUMN public.reviews.is_hidden IS 'Whether the review is hidden from public view';

-- =====================================================
-- 6. ADMIN HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'admin'
  );
$$;

-- Function to suspend a user
CREATE OR REPLACE FUNCTION admin_suspend_user(
  target_user_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  result JSONB;
BEGIN
  -- Get current user
  admin_user_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Suspend the user
  UPDATE profiles
  SET 
    is_suspended = true,
    suspension_reason = reason,
    suspended_at = now(),
    suspended_by = admin_user_id
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO admin_actions (
    admin_id, 
    action_type, 
    target_user_id, 
    reason
  ) VALUES (
    admin_user_id,
    'suspend_user',
    target_user_id,
    reason
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'User suspended successfully',
    'user_id', target_user_id
  );
  
  RETURN result;
END;
$$;

-- Function to unsuspend a user
CREATE OR REPLACE FUNCTION admin_unsuspend_user(
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  result JSONB;
BEGIN
  admin_user_id := auth.uid();
  
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE profiles
  SET 
    is_suspended = false,
    suspension_reason = NULL,
    suspended_at = NULL,
    suspended_by = NULL
  WHERE id = target_user_id;
  
  INSERT INTO admin_actions (
    admin_id, 
    action_type, 
    target_user_id
  ) VALUES (
    admin_user_id,
    'unsuspend_user',
    target_user_id
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'User unsuspended successfully'
  );
  
  RETURN result;
END;
$$;

-- Function to verify mentor
CREATE OR REPLACE FUNCTION admin_verify_mentor(
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
  result JSONB;
BEGIN
  admin_user_id := auth.uid();
  
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get mentor user_id from profile
  SELECT user_id INTO mentor_user_id
  FROM expert_profiles
  WHERE id = mentor_profile_id;
  
  -- Update expert profile
  UPDATE expert_profiles
  SET 
    is_verified = true,
    profile_status = 'active',
    verification_status = 'verified',
    verification_date = now()
  WHERE id = mentor_profile_id;
  
  -- Log the action
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
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Mentor verified successfully'
  );
  
  RETURN result;
END;
$$;

-- Function to reject mentor verification
CREATE OR REPLACE FUNCTION admin_reject_mentor(
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
  result JSONB;
BEGIN
  admin_user_id := auth.uid();
  
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT user_id INTO mentor_user_id
  FROM expert_profiles
  WHERE id = mentor_profile_id;
  
  UPDATE expert_profiles
  SET 
    is_verified = false,
    profile_status = 'inactive',
    verification_status = 'failed'
  WHERE id = mentor_profile_id;
  
  INSERT INTO admin_actions (
    admin_id, 
    action_type, 
    target_user_id,
    target_resource_id,
    target_resource_type,
    reason
  ) VALUES (
    admin_user_id,
    'reject_mentor',
    mentor_user_id,
    mentor_profile_id,
    'expert_profile',
    rejection_reason
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Mentor verification rejected',
    'reason', rejection_reason
  );
  
  RETURN result;
END;
$$;

-- Function to approve withdrawal request
CREATE OR REPLACE FUNCTION admin_approve_withdrawal(
  withdrawal_id UUID,
  transaction_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  withdrawal_record RECORD;
  result JSONB;
BEGIN
  admin_user_id := auth.uid();
  
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get withdrawal details
  SELECT * INTO withdrawal_record
  FROM withdrawal_requests
  WHERE id = withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or already processed';
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = admin_user_id,
    transaction_id = transaction_ref,
    notes = notes
  WHERE id = withdrawal_id;
  
  -- Log the action
  INSERT INTO admin_actions (
    admin_id, 
    action_type, 
    target_user_id,
    target_resource_id,
    target_resource_type,
    details
  ) VALUES (
    admin_user_id,
    'approve_withdrawal',
    withdrawal_record.mentor_id,
    withdrawal_id,
    'withdrawal_request',
    jsonb_build_object(
      'amount', withdrawal_record.amount,
      'transaction_id', transaction_ref,
      'notes', notes
    )
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Withdrawal approved successfully',
    'withdrawal_id', withdrawal_id
  );
  
  RETURN result;
END;
$$;

-- Function to reject withdrawal request
CREATE OR REPLACE FUNCTION admin_reject_withdrawal(
  withdrawal_id UUID,
  rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  withdrawal_record RECORD;
  result JSONB;
BEGIN
  admin_user_id := auth.uid();
  
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT * INTO withdrawal_record
  FROM withdrawal_requests
  WHERE id = withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or already processed';
  END IF;
  
  -- Restore funds to wallet
  UPDATE mentor_wallets
  SET balance = balance + withdrawal_record.amount
  WHERE mentor_id = withdrawal_record.mentor_id;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = admin_user_id,
    rejection_reason = rejection_reason
  WHERE id = withdrawal_id;
  
  INSERT INTO admin_actions (
    admin_id, 
    action_type, 
    target_user_id,
    target_resource_id,
    target_resource_type,
    reason
  ) VALUES (
    admin_user_id,
    'reject_withdrawal',
    withdrawal_record.mentor_id,
    withdrawal_id,
    'withdrawal_request',
    rejection_reason
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Withdrawal rejected and funds restored',
    'withdrawal_id', withdrawal_id
  );
  
  RETURN result;
END;
$$;

-- Function to hide/delete review
CREATE OR REPLACE FUNCTION admin_moderate_review(
  review_id UUID,
  action TEXT, -- 'hide' or 'delete'
  reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  review_record RECORD;
  result JSONB;
BEGIN
  admin_user_id := auth.uid();
  
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT * INTO review_record
  FROM reviews
  WHERE id = review_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found';
  END IF;
  
  IF action = 'hide' THEN
    UPDATE reviews
    SET 
      is_hidden = true,
      hidden_by = admin_user_id,
      hidden_at = now(),
      flag_reason = reason
    WHERE id = review_id;
    
    INSERT INTO admin_actions (
      admin_id, 
      action_type, 
      target_user_id,
      target_resource_id,
      target_resource_type,
      reason
    ) VALUES (
      admin_user_id,
      'flag_review',
      review_record.user_id,
      review_id,
      'review',
      reason
    );
    
    result := jsonb_build_object('success', true, 'message', 'Review hidden');
  ELSIF action = 'delete' THEN
    DELETE FROM reviews WHERE id = review_id;
    
    INSERT INTO admin_actions (
      admin_id, 
      action_type, 
      target_user_id,
      target_resource_id,
      target_resource_type,
      reason
    ) VALUES (
      admin_user_id,
      'delete_review',
      review_record.user_id,
      review_id,
      'review',
      reason
    );
    
    result := jsonb_build_object('success', true, 'message', 'Review deleted');
  ELSE
    RAISE EXCEPTION 'Invalid action. Use "hide" or "delete"';
  END IF;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 7. RLS POLICIES FOR ADMIN TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_wallets ENABLE ROW LEVEL SECURITY;

-- Admin actions: Only admins can view
CREATE POLICY "Admins can view all admin actions"
  ON admin_actions FOR SELECT
  USING (is_admin(auth.uid()));

-- Withdrawal requests: Admins can view all, mentors can view their own
CREATE POLICY "Admins can view all withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Mentors can view their own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = mentor_id);

-- Mentor wallets: Admins can view all, mentors can view their own
CREATE POLICY "Admins can view all wallets"
  ON mentor_wallets FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Mentors can view their own wallet"
  ON mentor_wallets FOR SELECT
  USING (auth.uid() = mentor_id);

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_mentor(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_mentor(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_withdrawal(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_withdrawal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_moderate_review(UUID, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 9. CREATE FIRST ADMIN USER (MANUAL STEP)
-- =====================================================
-- After migration, run this in SQL editor to assign admin role to a user:
-- 
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('YOUR_USER_ID_HERE', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
--
-- Replace YOUR_USER_ID_HERE with the actual UUID from auth.users
