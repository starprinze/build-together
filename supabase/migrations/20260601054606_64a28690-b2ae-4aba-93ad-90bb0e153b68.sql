-- Event-scoped leaderboard: aggregates points per event via match -> event link
CREATE OR REPLACE VIEW public.event_leaderboard
WITH (security_invoker = true)
AS
SELECT
  m.event_id,
  pt.user_id,
  COALESCE(pr.username, 'Player'::text) AS username,
  (SUM(pt.points))::integer AS total_points,
  (COUNT(*))::integer AS correct_predictions
FROM public.points pt
JOIN public.matches m ON m.id = pt.match_id
LEFT JOIN public.profiles pr ON pr.user_id = pt.user_id
GROUP BY m.event_id, pt.user_id, pr.username;

GRANT SELECT ON public.event_leaderboard TO anon;
GRANT SELECT ON public.event_leaderboard TO authenticated;
GRANT SELECT ON public.event_leaderboard TO service_role;