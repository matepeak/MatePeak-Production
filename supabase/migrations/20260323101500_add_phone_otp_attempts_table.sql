-- Phone OTP attempt tracking for rate limiting and lockout controls.

CREATE TABLE IF NOT EXISTS public.phone_otp_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  otp_requests_count INTEGER NOT NULL DEFAULT 0,
  failed_verify_attempts INTEGER NOT NULL DEFAULT 0,
  request_window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_otp_requested_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT phone_otp_attempts_phone_not_empty CHECK (length(trim(phone)) > 0),
  CONSTRAINT phone_otp_attempts_requests_nonnegative CHECK (otp_requests_count >= 0),
  CONSTRAINT phone_otp_attempts_failed_nonnegative CHECK (failed_verify_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_attempts_phone
  ON public.phone_otp_attempts (phone);

CREATE INDEX IF NOT EXISTS idx_phone_otp_attempts_locked_until
  ON public.phone_otp_attempts (locked_until);

COMMENT ON TABLE public.phone_otp_attempts IS 'Tracks phone OTP send/verify attempts for cooldown, send-limit and lockout enforcement.';
