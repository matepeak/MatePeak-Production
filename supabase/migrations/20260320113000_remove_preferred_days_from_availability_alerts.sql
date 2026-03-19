-- Remove preferred_days from availability_alerts and enforce date-based preferences only
DO $$
BEGIN
  IF to_regclass('public.availability_alerts') IS NULL THEN
    RAISE NOTICE 'Skipping migration 20260320113000: public.availability_alerts does not exist';
    RETURN;
  END IF;

  ALTER TABLE public.availability_alerts
  DROP COLUMN IF EXISTS preferred_days;

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
END;
$$;
