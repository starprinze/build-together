ALTER TABLE public.event_photos
ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image'
CHECK (media_type IN ('image', 'video'));