-- Extend availability alert preferences with required single-date or date-range selection
DO $$
BEGIN
  IF to_regclass('public.availability_alerts') IS NULL THEN
    RAISE NOTICE 'Skipping migration 20260319103000: public.availability_alerts does not exist yet';
    RETURN;
  END IF;

  ALTER TABLE public.availability_alerts
  ADD COLUMN IF NOT EXISTS preferred_single_date DATE,
  ADD COLUMN IF NOT EXISTS preferred_range_start DATE,
  ADD COLUMN IF NOT EXISTS preferred_range_end DATE,
  ADD COLUMN IF NOT EXISTS preferred_time_start TIME,
  ADD COLUMN IF NOT EXISTS preferred_time_end TIME;

  ALTER TABLE public.availability_alerts
  DROP CONSTRAINT IF EXISTS availability_alerts_date_range_check;

  ALTER TABLE public.availability_alerts
  DROP CONSTRAINT IF EXISTS availability_alerts_date_selection_check;

  ALTER TABLE public.availability_alerts
  ADD CONSTRAINT availability_alerts_date_selection_check
  CHECK (
    is_active = false
    OR (
      preferred_single_date IS NOT NULL
      AND preferred_range_start IS NULL
      AND preferred_range_end IS NULL
    )
    OR (
      preferred_single_date IS NULL
      AND preferred_range_start IS NOT NULL
      AND preferred_range_end IS NOT NULL
      AND preferred_range_start <= preferred_range_end
    )
  );

  ALTER TABLE public.availability_alerts
  DROP CONSTRAINT IF EXISTS availability_alerts_time_range_check;

  ALTER TABLE public.availability_alerts
  ADD CONSTRAINT availability_alerts_time_range_check
  CHECK (
    preferred_time_start IS NULL
    OR preferred_time_end IS NULL
    OR preferred_time_start < preferred_time_end
  );

  COMMENT ON COLUMN public.availability_alerts.preferred_single_date IS 'Single preferred date for alert matching';
  COMMENT ON COLUMN public.availability_alerts.preferred_range_start IS 'Preferred range start date for alert matching';
  COMMENT ON COLUMN public.availability_alerts.preferred_range_end IS 'Preferred range end date for alert matching';
  COMMENT ON COLUMN public.availability_alerts.preferred_time_start IS 'Optional daily start time for alert matching range';
  COMMENT ON COLUMN public.availability_alerts.preferred_time_end IS 'Optional daily end time for alert matching range';
END;
$$;