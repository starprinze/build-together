-- Phase 2: Competition formats + fixture management (additive only)

-- New competition formats (safe: values only added, never removed)
ALTER TYPE public.fixture_format ADD VALUE IF NOT EXISTS 'group_knockout';
ALTER TYPE public.fixture_format ADD VALUE IF NOT EXISTS 'swiss';
ALTER TYPE public.fixture_format ADD VALUE IF NOT EXISTS 'custom';

-- Organizer-controlled fixture details
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS venue text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS leg integer NOT NULL DEFAULT 1;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS label text;

-- Helpful index for time-ordered fixture views
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON public.matches (event_id, scheduled_at);