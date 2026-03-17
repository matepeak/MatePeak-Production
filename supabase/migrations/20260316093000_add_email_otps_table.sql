-- Email OTP table for registration verification
-- OTP validity: 1 minute

CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verify_attempts INTEGER NOT NULL DEFAULT 0 CHECK (verify_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_otps_email_not_empty CHECK (length(trim(email)) > 0),
  CONSTRAINT email_otps_hash_length CHECK (length(otp_hash) = 64)
);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_otps_email_created_at
  ON public.email_otps (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at
  ON public.email_otps (expires_at);

COMMENT ON TABLE public.email_otps IS 'Stores hashed email OTP codes for registration verification.';
COMMENT ON COLUMN public.email_otps.otp_hash IS 'SHA-256 hash of a 6-digit OTP, never store plain OTP.';
COMMENT ON COLUMN public.email_otps.expires_at IS 'OTP expiration timestamp (created_at + 1 minute).';
