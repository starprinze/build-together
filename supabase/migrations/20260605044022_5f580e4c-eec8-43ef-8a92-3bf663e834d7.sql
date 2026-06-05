-- Add an "archived" state so events can be hidden from the public yet remain recoverable
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'archived';

-- Performance indexes for multi-tenant scoping, leaderboards, and prediction windows
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events (organization_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);
CREATE INDEX IF NOT EXISTS idx_matches_event_id ON public.matches (event_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches (status);
CREATE INDEX IF NOT EXISTS idx_matches_prediction_deadline ON public.matches (prediction_deadline);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions (user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions (match_id);
CREATE INDEX IF NOT EXISTS idx_points_user_id ON public.points (user_id);
CREATE INDEX IF NOT EXISTS idx_points_match_id ON public.points (match_id);
CREATE INDEX IF NOT EXISTS idx_teams_event_id ON public.teams (event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos (event_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);