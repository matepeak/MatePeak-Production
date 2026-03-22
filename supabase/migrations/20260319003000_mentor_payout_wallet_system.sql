-- Mentor payout wallet system (Razorpay-ready)
-- Adds payout profile/KYC storage, earnings ledger, payout transactions,
-- and idempotent RPCs for crediting earnings + requesting/settling withdrawals.

-- 1) Payout profile for mentors
CREATE TABLE IF NOT EXISTS public.mentor_payout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  country_code TEXT NOT NULL DEFAULT 'IN',
  payout_method TEXT NOT NULL DEFAULT 'bank_account' CHECK (payout_method IN ('bank_account', 'upi')),
  account_type TEXT CHECK (account_type IN ('savings', 'current')),
  account_holder_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  upi_id TEXT,
  phone TEXT,
  email TEXT,
  pan_number TEXT,
  aadhaar_last4 TEXT,
  legal_name TEXT,
  business_name TEXT,
  is_kyc_verified BOOLEAN NOT NULL DEFAULT false,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  razorpay_contact_id TEXT,
  razorpay_fund_account_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_payout_profiles_mentor_id ON public.mentor_payout_profiles(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_payout_profiles_kyc_status ON public.mentor_payout_profiles(kyc_status);

-- 2) Earnings ledger for idempotent wallet credits
CREATE TABLE IF NOT EXISTS public.mentor_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  gross_amount NUMERIC(10, 2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee NUMERIC(10, 2) NOT NULL CHECK (platform_fee >= 0),
  net_amount NUMERIC(10, 2) NOT NULL CHECK (net_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'paid_out', 'reversed')),
  source TEXT NOT NULL DEFAULT 'booking_payment',
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_earnings_mentor_id ON public.mentor_earnings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_earnings_status ON public.mentor_earnings(status);
CREATE INDEX IF NOT EXISTS idx_mentor_earnings_created_at ON public.mentor_earnings(created_at DESC);

-- 3) Payout transaction table (tracks provider transfer status)
CREATE TABLE IF NOT EXISTS public.mentor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  withdrawal_request_id UUID REFERENCES public.withdrawal_requests(id) ON DELETE SET NULL,
  payout_profile_id UUID REFERENCES public.mentor_payout_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  payout_mode TEXT NOT NULL DEFAULT 'IMPS',
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_payout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')),
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_payouts_mentor_id ON public.mentor_payouts(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_status ON public.mentor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_created_at ON public.mentor_payouts(created_at DESC);

-- 4) Wallet enhancements
ALTER TABLE public.mentor_wallets
ADD COLUMN IF NOT EXISTS pending_withdrawal NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- 5) Withdrawal request status extension
ALTER TABLE public.withdrawal_requests
DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;

ALTER TABLE public.withdrawal_requests
ADD CONSTRAINT withdrawal_requests_status_check
CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'completed', 'failed'));

ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES public.mentor_payouts(id) ON DELETE SET NULL;

-- 6) Trigger helper for updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_payout_profiles_updated_at ON public.mentor_payout_profiles;
CREATE TRIGGER trg_mentor_payout_profiles_updated_at
BEFORE UPDATE ON public.mentor_payout_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_mentor_earnings_updated_at ON public.mentor_earnings;
CREATE TRIGGER trg_mentor_earnings_updated_at
BEFORE UPDATE ON public.mentor_earnings
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_mentor_payouts_updated_at ON public.mentor_payouts;
CREATE TRIGGER trg_mentor_payouts_updated_at
BEFORE UPDATE ON public.mentor_payouts
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- 7) Upsert payout profile (mentor self-service)
CREATE OR REPLACE FUNCTION public.upsert_mentor_payout_profile(
  p_currency TEXT,
  p_country_code TEXT,
  p_payout_method TEXT,
  p_account_type TEXT,
  p_account_holder_name TEXT,
  p_account_number TEXT,
  p_ifsc_code TEXT,
  p_upi_id TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_pan_number TEXT,
  p_aadhaar_last4 TEXT,
  p_legal_name TEXT,
  p_business_name TEXT,
  p_is_kyc_verified BOOLEAN DEFAULT false
)
RETURNS public.mentor_payout_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.mentor_payout_profiles;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.mentor_payout_profiles (
    mentor_id,
    currency,
    country_code,
    payout_method,
    account_type,
    account_holder_name,
    account_number,
    ifsc_code,
    upi_id,
    phone,
    email,
    pan_number,
    aadhaar_last4,
    legal_name,
    business_name,
    is_kyc_verified,
    kyc_status,
    is_active
  )
  VALUES (
    v_user_id,
    COALESCE(NULLIF(p_currency, ''), 'INR'),
    COALESCE(NULLIF(p_country_code, ''), 'IN'),
    COALESCE(NULLIF(p_payout_method, ''), 'bank_account'),
    NULLIF(p_account_type, ''),
    NULLIF(p_account_holder_name, ''),
    NULLIF(p_account_number, ''),
    NULLIF(upper(p_ifsc_code), ''),
    NULLIF(lower(p_upi_id), ''),
    NULLIF(p_phone, ''),
    NULLIF(lower(p_email), ''),
    NULLIF(upper(p_pan_number), ''),
    NULLIF(p_aadhaar_last4, ''),
    NULLIF(p_legal_name, ''),
    NULLIF(p_business_name, ''),
    COALESCE(p_is_kyc_verified, false),
    CASE WHEN COALESCE(p_is_kyc_verified, false) THEN 'verified' ELSE 'submitted' END,
    true
  )
  ON CONFLICT (mentor_id)
  DO UPDATE SET
    currency = EXCLUDED.currency,
    country_code = EXCLUDED.country_code,
    payout_method = EXCLUDED.payout_method,
    account_type = EXCLUDED.account_type,
    account_holder_name = EXCLUDED.account_holder_name,
    account_number = EXCLUDED.account_number,
    ifsc_code = EXCLUDED.ifsc_code,
    upi_id = EXCLUDED.upi_id,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    pan_number = EXCLUDED.pan_number,
    aadhaar_last4 = EXCLUDED.aadhaar_last4,
    legal_name = EXCLUDED.legal_name,
    business_name = EXCLUDED.business_name,
    is_kyc_verified = EXCLUDED.is_kyc_verified,
    kyc_status = EXCLUDED.kyc_status,
    is_active = true,
    updated_at = now()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- 8) Credit mentor wallet once per paid booking (idempotent)
CREATE OR REPLACE FUNCTION public.apply_mentor_earning_for_booking(
  p_booking_id UUID,
  p_platform_fee_percent NUMERIC DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_platform_fee NUMERIC(10, 2);
  v_net_amount NUMERIC(10, 2);
  v_inserted_earning_id UUID;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'booking_not_found',
      'message', 'Booking not found'
    );
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'not_confirmed',
      'message', 'Booking is not confirmed'
    );
  END IF;

  IF COALESCE(v_booking.total_amount, 0) <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', 'no_credit_required',
      'message', 'No payout credit for free booking',
      'booking_id', p_booking_id
    );
  END IF;

  IF COALESCE(v_booking.payment_status, '') NOT IN ('paid', 'completed') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'payment_not_settled',
      'message', 'Payment is not settled for wallet credit'
    );
  END IF;

  v_platform_fee := round((v_booking.total_amount * COALESCE(p_platform_fee_percent, 10)) / 100.0, 2);
  v_net_amount := round(v_booking.total_amount - v_platform_fee, 2);

  INSERT INTO public.mentor_earnings (
    mentor_id,
    booking_id,
    gross_amount,
    platform_fee,
    net_amount,
    currency,
    status,
    source
  )
  VALUES (
    v_booking.expert_id,
    v_booking.id,
    v_booking.total_amount,
    v_platform_fee,
    v_net_amount,
    'INR',
    'available',
    'booking_payment'
  )
  ON CONFLICT (booking_id) DO NOTHING
  RETURNING id INTO v_inserted_earning_id;

  IF v_inserted_earning_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', 'already_credited',
      'message', 'Mentor earning already credited',
      'booking_id', p_booking_id
    );
  END IF;

  INSERT INTO public.mentor_wallets (mentor_id, balance, total_earned, total_withdrawn, pending_withdrawal)
  VALUES (v_booking.expert_id, v_net_amount, v_net_amount, 0, 0)
  ON CONFLICT (mentor_id)
  DO UPDATE SET
    balance = public.mentor_wallets.balance + EXCLUDED.balance,
    total_earned = public.mentor_wallets.total_earned + EXCLUDED.total_earned,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'code', 'credited',
    'message', 'Mentor wallet credited',
    'booking_id', p_booking_id,
    'net_amount', v_net_amount,
    'platform_fee', v_platform_fee
  );
END;
$$;

-- 9) Mentor withdrawal request (atomic: reserve wallet funds + create request)
CREATE OR REPLACE FUNCTION public.request_mentor_withdrawal(
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wallet public.mentor_wallets%ROWTYPE;
  v_profile public.mentor_payout_profiles%ROWTYPE;
  v_withdrawal_id UUID;
  v_payout_id UUID;
  v_minimum_withdrawal NUMERIC := 500;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
  END IF;

  IF p_amount < v_minimum_withdrawal THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is %', v_minimum_withdrawal;
  END IF;

  SELECT *
  INTO v_profile
  FROM public.mentor_payout_profiles
  WHERE mentor_id = v_user_id
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout setup is incomplete. Please configure payments first.';
  END IF;

  IF v_profile.is_kyc_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'KYC is required before requesting withdrawal.';
  END IF;

  SELECT *
  INTO v_wallet
  FROM public.mentor_wallets
  WHERE mentor_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF COALESCE(v_wallet.balance, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE public.mentor_wallets
  SET
    balance = balance - p_amount,
    pending_withdrawal = pending_withdrawal + p_amount,
    updated_at = now()
  WHERE mentor_id = v_user_id;

  INSERT INTO public.withdrawal_requests (
    mentor_id,
    amount,
    status,
    account_details,
    notes,
    requested_at,
    reviewed_at,
    reviewed_by
  )
  VALUES (
    v_user_id,
    p_amount,
    'processing',
    jsonb_build_object(
      'currency', v_profile.currency,
      'country_code', v_profile.country_code,
      'payout_method', v_profile.payout_method,
      'account_type', v_profile.account_type,
      'account_holder_name', v_profile.account_holder_name,
      'account_number_masked', CASE
        WHEN v_profile.account_number IS NULL THEN NULL
        WHEN length(v_profile.account_number) <= 4 THEN v_profile.account_number
        ELSE concat(repeat('*', greatest(length(v_profile.account_number) - 4, 0)), right(v_profile.account_number, 4))
      END,
      'ifsc_code', v_profile.ifsc_code,
      'upi_id', v_profile.upi_id,
      'pan_number_masked', CASE
        WHEN v_profile.pan_number IS NULL THEN NULL
        WHEN length(v_profile.pan_number) <= 4 THEN v_profile.pan_number
        ELSE concat(left(v_profile.pan_number, 2), '*****', right(v_profile.pan_number, 3))
      END
    ),
    p_note,
    now(),
    NULL,
    NULL
  )
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO public.mentor_payouts (
    mentor_id,
    withdrawal_request_id,
    payout_profile_id,
    amount,
    currency,
    payout_mode,
    provider,
    status
  )
  VALUES (
    v_user_id,
    v_withdrawal_id,
    v_profile.id,
    p_amount,
    COALESCE(v_profile.currency, 'INR'),
    CASE WHEN v_profile.payout_method = 'upi' THEN 'UPI' ELSE 'IMPS' END,
    'razorpay',
    'processing'
  )
  RETURNING id INTO v_payout_id;

  UPDATE public.withdrawal_requests
  SET payout_id = v_payout_id
  WHERE id = v_withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'payout_id', v_payout_id,
    'status', 'processing',
    'amount', p_amount
  );
END;
$$;

-- 10) Mark payout success
CREATE OR REPLACE FUNCTION public.mark_mentor_payout_success(
  p_payout_id UUID,
  p_provider_payout_id TEXT,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.mentor_payouts%ROWTYPE;
BEGIN
  SELECT *
  INTO v_payout
  FROM public.mentor_payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;

  IF v_payout.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'code', 'already_success');
  END IF;

  UPDATE public.mentor_payouts
  SET
    status = 'success',
    provider_payout_id = COALESCE(p_provider_payout_id, provider_payout_id),
    provider_response = COALESCE(p_provider_response, provider_response),
    processed_at = now(),
    updated_at = now()
  WHERE id = p_payout_id;

  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    reviewed_at = now(),
    completed_at = now(),
    transaction_id = COALESCE(p_provider_payout_id, transaction_id)
  WHERE id = v_payout.withdrawal_request_id;

  UPDATE public.mentor_wallets
  SET
    pending_withdrawal = GREATEST(0, pending_withdrawal - v_payout.amount),
    total_withdrawn = total_withdrawn + v_payout.amount,
    updated_at = now()
  WHERE mentor_id = v_payout.mentor_id;

  RETURN jsonb_build_object('success', true, 'code', 'payout_success');
END;
$$;

-- 11) Mark payout failure and restore funds
CREATE OR REPLACE FUNCTION public.mark_mentor_payout_failed(
  p_payout_id UUID,
  p_failure_reason TEXT,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.mentor_payouts%ROWTYPE;
BEGIN
  SELECT *
  INTO v_payout
  FROM public.mentor_payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;

  IF v_payout.status IN ('failed', 'cancelled') THEN
    RETURN jsonb_build_object('success', true, 'code', 'already_failed');
  END IF;

  UPDATE public.mentor_payouts
  SET
    status = 'failed',
    failure_reason = COALESCE(p_failure_reason, failure_reason),
    provider_response = COALESCE(p_provider_response, provider_response),
    processed_at = now(),
    updated_at = now()
  WHERE id = p_payout_id;

  UPDATE public.withdrawal_requests
  SET
    status = 'failed',
    reviewed_at = now(),
    rejection_reason = COALESCE(p_failure_reason, rejection_reason)
  WHERE id = v_payout.withdrawal_request_id;

  UPDATE public.mentor_wallets
  SET
    balance = balance + v_payout.amount,
    pending_withdrawal = GREATEST(0, pending_withdrawal - v_payout.amount),
    updated_at = now()
  WHERE mentor_id = v_payout.mentor_id;

  RETURN jsonb_build_object('success', true, 'code', 'payout_failed_restored');
END;
$$;

-- 12) RLS
ALTER TABLE public.mentor_payout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentors can view own payout profile" ON public.mentor_payout_profiles;
CREATE POLICY "Mentors can view own payout profile"
ON public.mentor_payout_profiles FOR SELECT
USING (auth.uid() = mentor_id);

DROP POLICY IF EXISTS "Mentors can upsert own payout profile" ON public.mentor_payout_profiles;
CREATE POLICY "Mentors can upsert own payout profile"
ON public.mentor_payout_profiles FOR INSERT
WITH CHECK (auth.uid() = mentor_id);

DROP POLICY IF EXISTS "Mentors can update own payout profile" ON public.mentor_payout_profiles;
CREATE POLICY "Mentors can update own payout profile"
ON public.mentor_payout_profiles FOR UPDATE
USING (auth.uid() = mentor_id)
WITH CHECK (auth.uid() = mentor_id);

DROP POLICY IF EXISTS "Admins can view payout profiles" ON public.mentor_payout_profiles;
CREATE POLICY "Admins can view payout profiles"
ON public.mentor_payout_profiles FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Mentors can view own earnings" ON public.mentor_earnings;
CREATE POLICY "Mentors can view own earnings"
ON public.mentor_earnings FOR SELECT
USING (auth.uid() = mentor_id);

DROP POLICY IF EXISTS "Admins can view all earnings" ON public.mentor_earnings;
CREATE POLICY "Admins can view all earnings"
ON public.mentor_earnings FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Mentors can view own payouts" ON public.mentor_payouts;
CREATE POLICY "Mentors can view own payouts"
ON public.mentor_payouts FOR SELECT
USING (auth.uid() = mentor_id);

DROP POLICY IF EXISTS "Admins can view all payouts" ON public.mentor_payouts;
CREATE POLICY "Admins can view all payouts"
ON public.mentor_payouts FOR SELECT
USING (is_admin(auth.uid()));

-- 13) Grants
GRANT EXECUTE ON FUNCTION public.upsert_mentor_payout_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_mentor_earning_for_booking(UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_mentor_withdrawal(NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_mentor_payout_success(UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_mentor_payout_failed(UUID, TEXT, JSONB) TO authenticated, service_role;
