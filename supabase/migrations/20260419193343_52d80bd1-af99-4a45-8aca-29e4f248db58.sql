-- Event photos (Cloudinary-hosted URLs)
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  caption text,
  width integer,
  height integer,
  cloudinary_public_id text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_photos_event ON public.event_photos(event_id, created_at DESC);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event photos are viewable by everyone"
  ON public.event_photos FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage event photos"
  ON public.event_photos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Realtime: full row payloads + add to publication
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.event_photos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_photos;