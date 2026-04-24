-- 1. Format enum + column on events
CREATE TYPE public.fixture_format AS ENUM ('single_elim', 'double_elim', 'round_robin', 'league');

ALTER TABLE public.events
  ADD COLUMN format public.fixture_format NOT NULL DEFAULT 'single_elim';

-- 2. AI summary column on matches
ALTER TABLE public.matches
  ADD COLUMN summary text;

-- 3. Bracket bracket bracket: track group/bracket side for round-robin / double-elim
ALTER TABLE public.matches
  ADD COLUMN bracket text NOT NULL DEFAULT 'main';
-- 'main' for single-elim/round-robin, 'winners'/'losers'/'grand_final' for double-elim

-- 4. Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_created ON public.notifications (created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications"
ON public.notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update notifications"
ON public.notifications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- System inserts via triggers (security definer functions); also allow admin manual inserts
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 5. Trigger: notify on new team
CREATE OR REPLACE FUNCTION public.notify_team_registered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev_name text;
BEGIN
  SELECT name INTO ev_name FROM public.events WHERE id = NEW.event_id;
  INSERT INTO public.notifications (type, title, body, event_id, team_id)
  VALUES (
    'team_registered',
    'New team registered',
    NEW.name || ' joined ' || COALESCE(ev_name, 'an event'),
    NEW.event_id,
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_team_registered
AFTER INSERT ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.notify_team_registered();

-- 6. Trigger: notify on match completion
CREATE OR REPLACE FUNCTION public.notify_match_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  winner_name text;
  loser_name text;
  ev_name text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.winner_id IS NOT NULL THEN
    SELECT name INTO winner_name FROM public.teams WHERE id = NEW.winner_id;
    SELECT name INTO loser_name FROM public.teams
      WHERE id = CASE WHEN NEW.winner_id = NEW.team_a_id THEN NEW.team_b_id ELSE NEW.team_a_id END;
    SELECT name INTO ev_name FROM public.events WHERE id = NEW.event_id;
    INSERT INTO public.notifications (type, title, body, event_id, match_id)
    VALUES (
      'match_completed',
      'Match result recorded',
      COALESCE(winner_name, 'Team') || ' beat ' || COALESCE(loser_name, 'opponent') ||
      ' ' || COALESCE(NEW.score_a::text, '0') || '-' || COALESCE(NEW.score_b::text, '0') ||
      ' (' || COALESCE(ev_name, 'event') || ')',
      NEW.event_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_match_completed
AFTER UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.notify_match_completed();

-- 7. Storage bucket for event photos (public read so URLs work directly in <img>)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Event photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-photos');

CREATE POLICY "Admins can upload event photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update event photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete event photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));