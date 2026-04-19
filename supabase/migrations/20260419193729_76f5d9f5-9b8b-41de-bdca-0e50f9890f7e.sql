CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App config is readable by everyone"
  ON public.app_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage app config"
  ON public.app_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_config (key, value) VALUES
  ('cloudinary_cloud_name', NULL),
  ('cloudinary_upload_preset', NULL)
ON CONFLICT (key) DO NOTHING;