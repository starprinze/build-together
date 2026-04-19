-- Add logo and roster to teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS roster text;

-- Create public storage bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, admin write
CREATE POLICY "Team logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Admins can upload team logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-logos' AND public.has_role(auth.uid(), 'admin'));