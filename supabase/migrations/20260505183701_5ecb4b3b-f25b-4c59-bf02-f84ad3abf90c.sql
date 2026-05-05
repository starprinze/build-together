DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT
  pt.user_id,
  COALESCE(pr.username, 'Player') AS username,
  SUM(pt.points)::int AS total_points,
  COUNT(*)::int AS correct_predictions
FROM public.points pt
LEFT JOIN public.profiles pr ON pr.user_id = pt.user_id
GROUP BY pt.user_id, pr.username;

GRANT SELECT ON public.leaderboard TO anon, authenticated;