-- Match commentary timeline
CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'comment',
  minute integer,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_match_events_match ON public.match_events(match_id, created_at);
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match events viewable by everyone"
  ON public.match_events FOR SELECT USING (true);
CREATE POLICY "Admins manage match events"
  ON public.match_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public emoji reactions
CREATE TABLE public.match_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  emoji text NOT NULL,
  client_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, emoji, client_id)
);
CREATE INDEX idx_match_reactions_match ON public.match_reactions(match_id);
ALTER TABLE public.match_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by everyone"
  ON public.match_reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can react"
  ON public.match_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins delete reactions"
  ON public.match_reactions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_reactions;