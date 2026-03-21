-- Ensure availability_alerts exists in environments where older migrations were not applied
CREATE TABLE IF NOT EXISTS public.availability_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  preferred_single_date DATE,
  preferred_range_start DATE,
  preferred_range_end DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mentee_id, mentor_id),
  CONSTRAINT availability_alerts_date_selection_check
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
    ),
  CONSTRAINT availability_alerts_time_range_check
    CHECK (
      preferred_time_start IS NULL
      OR preferred_time_end IS NULL
      OR preferred_time_start < preferred_time_end
    )
);

CREATE INDEX IF NOT EXISTS idx_availability_alerts_mentee ON public.availability_alerts(mentee_id);
CREATE INDEX IF NOT EXISTS idx_availability_alerts_mentor ON public.availability_alerts(mentor_id);
CREATE INDEX IF NOT EXISTS idx_availability_alerts_active ON public.availability_alerts(is_active);

ALTER TABLE public.availability_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'availability_alerts'
      AND policyname = 'Users can view their own alerts'
  ) THEN
    CREATE POLICY "Users can view their own alerts"
      ON public.availability_alerts FOR SELECT
      USING (auth.uid() = mentee_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'availability_alerts'
      AND policyname = 'Mentors can view alerts for their profile'
  ) THEN
    CREATE POLICY "Mentors can view alerts for their profile"
      ON public.availability_alerts FOR SELECT
      USING (auth.uid() = mentor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'availability_alerts'
      AND policyname = 'Users can manage their own alerts'
  ) THEN
    CREATE POLICY "Users can manage their own alerts"
      ON public.availability_alerts FOR INSERT
      WITH CHECK (auth.uid() = mentee_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'availability_alerts'
      AND policyname = 'Users can update their own alerts'
  ) THEN
    CREATE POLICY "Users can update their own alerts"
      ON public.availability_alerts FOR UPDATE
      USING (auth.uid() = mentee_id)
      WITH CHECK (auth.uid() = mentee_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'availability_alerts'
      AND policyname = 'Users can delete their own alerts'
  ) THEN
    CREATE POLICY "Users can delete their own alerts"
      ON public.availability_alerts FOR DELETE
      USING (auth.uid() = mentee_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_availability_alerts_updated_at ON public.availability_alerts;

CREATE TRIGGER update_availability_alerts_updated_at
  BEFORE UPDATE ON public.availability_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.availability_alerts IS 'Stores alert subscriptions for mentee notifications when mentor availability changes';
COMMENT ON COLUMN public.availability_alerts.preferred_single_date IS 'Single preferred date for alert matching';
COMMENT ON COLUMN public.availability_alerts.preferred_range_start IS 'Preferred range start date for alert matching';
COMMENT ON COLUMN public.availability_alerts.preferred_range_end IS 'Preferred range end date for alert matching';
COMMENT ON COLUMN public.availability_alerts.preferred_time_start IS 'Optional daily start time for alert matching range';
COMMENT ON COLUMN public.availability_alerts.preferred_time_end IS 'Optional daily end time for alert matching range';
