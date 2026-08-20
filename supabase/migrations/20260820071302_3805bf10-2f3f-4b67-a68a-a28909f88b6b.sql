-- 1. Remove duplicate triggers
DROP TRIGGER IF EXISTS trg_matches_award_points ON public.matches;
DROP TRIGGER IF EXISTS trg_matches_set_result ON public.matches;

-- 2. Result derivation also covers walkover, and never overwrites an explicit result
CREATE OR REPLACE FUNCTION public.allocate_prediction_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('completed','walkover') AND NEW.result IS NULL THEN
    IF NEW.winner_id IS NOT NULL AND NEW.winner_id = NEW.team_a_id THEN
      NEW.result := 'team_a';
    ELSIF NEW.winner_id IS NOT NULL AND NEW.winner_id = NEW.team_b_id THEN
      NEW.result := 'team_b';
    ELSIF NEW.score_a IS NOT NULL AND NEW.score_b IS NOT NULL THEN
      IF NEW.score_a > NEW.score_b THEN NEW.result := 'team_a';
      ELSIF NEW.score_b > NEW.score_a THEN NEW.result := 'team_b';
      ELSE NEW.result := 'draw';
      END IF;
    END IF;
  END IF;

  -- Reopening a match clears its result so points are recomputed on the next finish
  IF NEW.status NOT IN ('completed','walkover') AND OLD.status IN ('completed','walkover') THEN
    NEW.result := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Prediction privacy
CREATE OR REPLACE FUNCTION public.predictions_revealed(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT NOT public.can_predict(_match_id);
$function$;

DROP POLICY IF EXISTS "Predictions viewable by everyone" ON public.predictions;

CREATE POLICY "Users view own predictions"
ON public.predictions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Revealed predictions viewable by authenticated"
ON public.predictions FOR SELECT TO authenticated
USING (public.predictions_revealed(match_id));

CREATE POLICY "Event managers view predictions"
ON public.predictions FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.can_manage_event((SELECT m.event_id FROM public.matches m WHERE m.id = match_id))
);

REVOKE SELECT ON public.predictions FROM anon;

-- 4. Consolidate leaderboard views
DROP VIEW IF EXISTS public.leaderboard;