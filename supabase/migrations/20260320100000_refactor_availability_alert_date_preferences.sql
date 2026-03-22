-- Refactor availability alerts date preferences:
-- Remove preferred_date_start/preferred_date_end and require either single date or date range.
DO $$
BEGIN
  IF to_regclass('public.availability_alerts') IS NULL THEN
    RAISE NOTICE 'Skipping migration 20260320100000: public.availability_alerts does not exist';
    RETURN;
  END IF;

  ALTER TABLE public.availability_alerts
  ADD COLUMN IF NOT EXISTS preferred_single_date DATE,
  ADD COLUMN IF NOT EXISTS preferred_range_start DATE,
  ADD COLUMN IF NOT EXISTS preferred_range_end DATE;

  -- Migrate old date fields when present.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'availability_alerts'
      AND column_name = 'preferred_date_start'
  ) THEN
    UPDATE public.availability_alerts
    SET preferred_single_date = COALESCE(preferred_single_date, preferred_date_start)
    WHERE preferred_date_start IS NOT NULL
      AND (preferred_date_end IS NULL OR preferred_date_start = preferred_date_end);

    UPDATE public.availability_alerts
    SET
      preferred_range_start = COALESCE(preferred_range_start, preferred_date_start),
      preferred_range_end = COALESCE(preferred_range_end, preferred_date_end)
    WHERE preferred_date_start IS NOT NULL
      AND preferred_date_end IS NOT NULL
      AND preferred_date_start <> preferred_date_end;

    UPDATE public.availability_alerts
    SET preferred_single_date = COALESCE(preferred_single_date, preferred_date_start, preferred_date_end)
    WHERE preferred_single_date IS NULL
      AND (
        (preferred_date_start IS NOT NULL AND preferred_date_end IS NULL)
        OR (preferred_date_start IS NULL AND preferred_date_end IS NOT NULL)
      );
  END IF;

  -- Ensure single-date and range are mutually exclusive.
  UPDATE public.availability_alerts
  SET
    preferred_range_start = NULL,
    preferred_range_end = NULL
  WHERE preferred_single_date IS NOT NULL
    AND preferred_range_start IS NOT NULL
    AND preferred_range_end IS NOT NULL;

  -- Disable invalid active alerts until user updates preferences.
  UPDATE public.availability_alerts
  SET is_active = false
  WHERE is_active = true
    AND NOT (
      (
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
  DROP COLUMN IF EXISTS preferred_date_start,
  DROP COLUMN IF EXISTS preferred_date_end;

  COMMENT ON COLUMN public.availability_alerts.preferred_single_date IS 'Single preferred date for alert matching';
  COMMENT ON COLUMN public.availability_alerts.preferred_range_start IS 'Preferred range start date for alert matching';
  COMMENT ON COLUMN public.availability_alerts.preferred_range_end IS 'Preferred range end date for alert matching';
END;
$$;
