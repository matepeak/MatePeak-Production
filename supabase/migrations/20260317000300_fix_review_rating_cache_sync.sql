-- ============================================================================
-- Fix mentor rating cache sync from reviews
-- Ensures expert_profiles.average_rating and expert_profiles.total_reviews
-- stay in sync when reviews are inserted/updated/deleted.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_mentor_rating(mentor_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
  review_count INTEGER;
BEGIN
  SELECT
    COALESCE(AVG(r.rating), 0.0)::DECIMAL(3, 2),
    COUNT(*)
  INTO avg_rating, review_count
  FROM public.reviews r
  WHERE
    (to_jsonb(r)->>'expert_id')::uuid = mentor_id
    OR (to_jsonb(r)->>'mentor_id')::uuid = mentor_id;

  UPDATE public.expert_profiles
  SET
    average_rating = avg_rating,
    total_reviews = review_count,
    updated_at = now()
  WHERE id = mentor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trigger_update_mentor_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_mentor_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_mentor_id := COALESCE(
      (to_jsonb(OLD)->>'expert_id')::uuid,
      (to_jsonb(OLD)->>'mentor_id')::uuid
    );
  ELSE
    target_mentor_id := COALESCE(
      (to_jsonb(NEW)->>'expert_id')::uuid,
      (to_jsonb(NEW)->>'mentor_id')::uuid
    );
  END IF;

  IF target_mentor_id IS NOT NULL THEN
    PERFORM public.update_mentor_rating(target_mentor_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_mentor_rating_on_review ON public.reviews;
CREATE TRIGGER update_mentor_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_mentor_rating();

-- Backfill cached ratings for all mentors
DO $$
DECLARE
  mentor_record RECORD;
BEGIN
  FOR mentor_record IN SELECT id FROM public.expert_profiles LOOP
    PERFORM public.update_mentor_rating(mentor_record.id);
  END LOOP;
END $$;
