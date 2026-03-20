-- =====================================================
-- Mentor payout accounts + secure withdrawal rules
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('bank', 'upi')),
  account_holder_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  upi_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'pending', 'verified', 'failed')
  ),
  verification_reference TEXT,
  verification_message TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT payout_details_by_method CHECK (
    (
      payout_method = 'bank'
      AND account_holder_name IS NOT NULL
      AND account_number IS NOT NULL
      AND ifsc_code IS NOT NULL
      AND bank_name IS NOT NULL
    )
    OR
    (
      payout_method = 'upi'
      AND upi_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_mentor_payout_accounts_mentor_id
  ON public.mentor_payout_accounts(mentor_id);

COMMENT ON TABLE public.mentor_payout_accounts IS 'Mentor payout destination and verification status';

DROP TRIGGER IF EXISTS mentor_payout_accounts_updated_at ON public.mentor_payout_accounts;
CREATE TRIGGER mentor_payout_accounts_updated_at
  BEFORE UPDATE ON public.mentor_payout_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mentor_payout_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payout_accounts'
      AND policyname = 'Mentors can view own payout account'
  ) THEN
    CREATE POLICY "Mentors can view own payout account"
      ON public.mentor_payout_accounts
      FOR SELECT
      USING (auth.uid() = mentor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payout_accounts'
      AND policyname = 'Mentors can insert own payout account'
  ) THEN
    CREATE POLICY "Mentors can insert own payout account"
      ON public.mentor_payout_accounts
      FOR INSERT
      WITH CHECK (auth.uid() = mentor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payout_accounts'
      AND policyname = 'Mentors can update own payout account'
  ) THEN
    CREATE POLICY "Mentors can update own payout account"
      ON public.mentor_payout_accounts
      FOR UPDATE
      USING (auth.uid() = mentor_id)
      WITH CHECK (auth.uid() = mentor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payout_accounts'
      AND policyname = 'Admins can view all payout accounts'
  ) THEN
    CREATE POLICY "Admins can view all payout accounts"
      ON public.mentor_payout_accounts
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payout_accounts'
      AND policyname = 'Admins can update payout accounts'
  ) THEN
    CREATE POLICY "Admins can update payout accounts"
      ON public.mentor_payout_accounts
      FOR UPDATE
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Backfill wallet rows for existing mentors
INSERT INTO public.mentor_wallets (mentor_id, balance, total_earned, total_withdrawn)
SELECT ep.id, 0.00, 0.00, 0.00
FROM public.expert_profiles ep
LEFT JOIN public.mentor_wallets mw ON mw.mentor_id = ep.id
WHERE mw.mentor_id IS NULL;

-- Ensure wallet row exists for every new mentor profile
CREATE OR REPLACE FUNCTION public.ensure_mentor_wallet_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mentor_wallets (mentor_id, balance, total_earned, total_withdrawn)
  VALUES (NEW.id, 0.00, 0.00, 0.00)
  ON CONFLICT (mentor_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_expert_profile_create_wallet ON public.expert_profiles;
CREATE TRIGGER on_expert_profile_create_wallet
  AFTER INSERT ON public.expert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_mentor_wallet_exists();

-- Secure mentor withdrawal creation with threshold + verified payout checks
CREATE OR REPLACE FUNCTION public.mentor_create_withdrawal_request(
  p_amount NUMERIC(10, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_wallet public.mentor_wallets%ROWTYPE;
  v_payout public.mentor_payout_accounts%ROWTYPE;
  v_withdrawal_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount IS NULL OR p_amount < 500 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is ₹500';
  END IF;

  SELECT *
  INTO v_wallet
  FROM public.mentor_wallets
  WHERE mentor_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.mentor_wallets (mentor_id, balance, total_earned, total_withdrawn)
    VALUES (v_user_id, 0.00, 0.00, 0.00)
    RETURNING * INTO v_wallet;
  END IF;

  IF v_wallet.balance < 500 THEN
    RAISE EXCEPTION 'Minimum wallet balance ₹500 required before withdrawal';
  END IF;

  IF p_amount > v_wallet.balance THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  SELECT *
  INTO v_payout
  FROM public.mentor_payout_accounts
  WHERE mentor_id = v_user_id
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Please add payout details before requesting withdrawal';
  END IF;

  IF v_payout.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'Payout account must be verified before withdrawal';
  END IF;

  INSERT INTO public.withdrawal_requests (
    mentor_id,
    amount,
    status,
    account_details,
    requested_at
  ) VALUES (
    v_user_id,
    p_amount,
    'pending',
    jsonb_build_object(
      'payout_method', v_payout.payout_method,
      'account_holder_name', v_payout.account_holder_name,
      'account_number', v_payout.account_number,
      'ifsc_code', v_payout.ifsc_code,
      'bank_name', v_payout.bank_name,
      'upi_id', v_payout.upi_id,
      'verification_reference', v_payout.verification_reference
    ),
    now()
  )
  RETURNING id INTO v_withdrawal_id;

  UPDATE public.mentor_wallets
  SET
    balance = balance - p_amount,
    updated_at = now()
  WHERE mentor_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request submitted successfully',
    'withdrawal_id', v_withdrawal_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mentor_create_withdrawal_request(NUMERIC) TO authenticated;
