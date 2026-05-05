-- 1. Extend matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS prediction_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS result text CHECK (result IN ('team_a','team_b','draw'));

-- 2. Profiles (public username for leaderboard)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- 3. Predictions
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  prediction text NOT NULL CHECK (prediction IN ('team_a','team_b','draw')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS predictions_match_idx ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS predictions_user_idx ON public.predictions(user_id);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions viewable by everyone"
  ON public.predictions FOR SELECT USING (true);

-- Insert allowed only for owner, and only before the deadline, and only when match still pending.
CREATE OR REPLACE FUNCTION public.can_predict(_match_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id
      AND m.status = 'pending'
      AND m.result IS NULL
      AND (m.prediction_deadline IS NULL OR m.prediction_deadline > now())
  );
$$;

CREATE POLICY "Users insert own predictions before deadline"
  ON public.predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.can_predict(match_id));

-- No update / no delete policies → predictions are immutable for users.
-- Admins can manage everything:
CREATE POLICY "Admins manage predictions"
  ON public.predictions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Points
CREATE TABLE IF NOT EXISTS public.points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 10,
  reason text NOT NULL DEFAULT 'correct_prediction',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id, reason)  -- idempotent allocation
);

CREATE INDEX IF NOT EXISTS points_user_idx ON public.points(user_id);

ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points viewable by everyone"
  ON public.points FOR SELECT USING (true);

CREATE POLICY "Admins manage points"
  ON public.points FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Trigger: when a match is completed, derive result + award points.
CREATE OR REPLACE FUNCTION public.allocate_prediction_points()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  derived text;
BEGIN
  -- Derive result from score if not explicitly set
  IF NEW.status = 'completed' AND NEW.result IS NULL
     AND NEW.score_a IS NOT NULL AND NEW.score_b IS NOT NULL THEN
    IF NEW.score_a > NEW.score_b THEN derived := 'team_a';
    ELSIF NEW.score_b > NEW.score_a THEN derived := 'team_b';
    ELSE derived := 'draw';
    END IF;
    NEW.result := derived;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_set_result ON public.matches;
CREATE TRIGGER trg_matches_set_result
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.allocate_prediction_points();

CREATE OR REPLACE FUNCTION public.award_prediction_points()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.result IS NOT NULL AND (OLD.result IS DISTINCT FROM NEW.result) THEN
    INSERT INTO public.points (user_id, match_id, points, reason)
    SELECT p.user_id, NEW.id, 10, 'correct_prediction'
    FROM public.predictions p
    WHERE p.match_id = NEW.id
      AND p.prediction = NEW.result
    ON CONFLICT (user_id, match_id, reason) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_award_points ON public.matches;
CREATE TRIGGER trg_matches_award_points
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.award_prediction_points();

-- 6. Leaderboard view
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  pt.user_id,
  COALESCE(pr.username, 'Player') AS username,
  SUM(pt.points)::int AS total_points,
  COUNT(*)::int AS correct_predictions
FROM public.points pt
LEFT JOIN public.profiles pr ON pr.user_id = pt.user_id
GROUP BY pt.user_id, pr.username
ORDER BY total_points DESC;

GRANT SELECT ON public.leaderboard TO anon, authenticated;