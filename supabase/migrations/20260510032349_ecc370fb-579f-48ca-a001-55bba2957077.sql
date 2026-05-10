-- 1. Extend match_status enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'match_status' AND e.enumlabel = 'live') THEN
    ALTER TYPE match_status ADD VALUE 'live';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'match_status' AND e.enumlabel = 'cancelled') THEN
    ALTER TYPE match_status ADD VALUE 'cancelled';
  END IF;
END$$;

-- 2. Update can_predict so only 'pending' (upcoming) matches accept predictions
CREATE OR REPLACE FUNCTION public.can_predict(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id
      AND m.status = 'pending'
      AND m.result IS NULL
      AND (m.prediction_deadline IS NULL OR m.prediction_deadline > now())
  );
$$;

-- 3. Ensure the result-derivation + points-award triggers actually run
DROP TRIGGER IF EXISTS trg_allocate_prediction_points ON public.matches;
CREATE TRIGGER trg_allocate_prediction_points
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.allocate_prediction_points();

DROP TRIGGER IF EXISTS trg_award_prediction_points ON public.matches;
CREATE TRIGGER trg_award_prediction_points
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.award_prediction_points();

DROP TRIGGER IF EXISTS trg_notify_match_completed ON public.matches;
CREATE TRIGGER trg_notify_match_completed
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.notify_match_completed();

DROP TRIGGER IF EXISTS trg_notify_team_registered ON public.teams;
CREATE TRIGGER trg_notify_team_registered
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_registered();

-- 4. Prevent duplicate point allocations per (user, match, reason)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'points_user_match_reason_uniq'
  ) THEN
    CREATE UNIQUE INDEX points_user_match_reason_uniq
      ON public.points (user_id, match_id, reason);
  END IF;
END$$;