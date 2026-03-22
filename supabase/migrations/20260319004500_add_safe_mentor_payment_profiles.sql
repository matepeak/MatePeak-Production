-- Safe, additive migration for mentor payment setup.
-- No ALTER/DROP of existing payout tables or constraints.

CREATE TABLE IF NOT EXISTS public.mentor_payment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_payment_profiles_mentor_id
  ON public.mentor_payment_profiles(mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentor_payment_profiles_kyc_status
  ON public.mentor_payment_profiles(kyc_status);

CREATE OR REPLACE FUNCTION public.upsert_mentor_payment_profile(
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
RETURNS public.mentor_payment_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.mentor_payment_profiles;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.mentor_payment_profiles (
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
    is_active,
    updated_at
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
    true,
    now()
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

ALTER TABLE public.mentor_payment_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payment_profiles'
      AND policyname = 'Mentors can view own payment profile'
  ) THEN
    CREATE POLICY "Mentors can view own payment profile"
      ON public.mentor_payment_profiles FOR SELECT
      USING (auth.uid() = mentor_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payment_profiles'
      AND policyname = 'Mentors can insert own payment profile'
  ) THEN
    CREATE POLICY "Mentors can insert own payment profile"
      ON public.mentor_payment_profiles FOR INSERT
      WITH CHECK (auth.uid() = mentor_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_payment_profiles'
      AND policyname = 'Mentors can update own payment profile'
  ) THEN
    CREATE POLICY "Mentors can update own payment profile"
      ON public.mentor_payment_profiles FOR UPDATE
      USING (auth.uid() = mentor_id)
      WITH CHECK (auth.uid() = mentor_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin'
      AND pg_function_is_visible(oid)
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'mentor_payment_profiles'
        AND policyname = 'Admins can view payment profiles'
    ) THEN
      CREATE POLICY "Admins can view payment profiles"
        ON public.mentor_payment_profiles FOR SELECT
        USING (is_admin(auth.uid()));
    END IF;
  END IF;
END
$$;

GRANT EXECUTE ON FUNCTION public.upsert_mentor_payment_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated, service_role;
