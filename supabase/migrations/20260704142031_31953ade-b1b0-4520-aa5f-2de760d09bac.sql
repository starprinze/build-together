-- Phase 4: richer match lifecycle states
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'halftime';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'break';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'extra_time';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'penalties';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'walkover';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'postponed';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'abandoned';

-- Phase 6: granular organizer roles
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'referee';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'media';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'volunteer';

-- Phase 3: groups
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  qualify_count integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by everyone"
  ON public.groups FOR SELECT USING (true);
CREATE POLICY "Org managers can manage their groups"
  ON public.groups FOR ALL TO authenticated
  USING (public.can_manage_event(event_id))
  WITH CHECK (public.can_manage_event(event_id));

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 3: link matches to a group
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Phase 5: players / squads
CREATE TABLE IF NOT EXISTS public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  jersey_number integer,
  position text,
  photo_url text,
  is_captain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players are viewable by everyone"
  ON public.players FOR SELECT USING (true);
CREATE POLICY "Org managers can manage their players"
  ON public.players FOR ALL TO authenticated
  USING (public.can_manage_event(event_id))
  WITH CHECK (public.can_manage_event(event_id));

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_groups_event ON public.groups(event_id);
CREATE INDEX IF NOT EXISTS idx_matches_group ON public.matches(group_id);