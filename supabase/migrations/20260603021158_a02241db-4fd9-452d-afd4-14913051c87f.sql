-- 0. Timestamp helper (create if missing)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Organizations table
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  owner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.owns_organization(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND owner_id = auth.uid()
  );
$$;

-- 3. RLS policies for organizations
CREATE POLICY "Organizations are viewable by everyone"
ON public.organizations
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners or super admins can update organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR public.is_super_admin(auth.uid()))
WITH CHECK (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Owners or super admins can delete organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- 4. updated_at trigger
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Add organization_id to events
ALTER TABLE public.events
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_events_organization_id ON public.events(organization_id);

-- 6. Backfill: create default organization, owned by first admin (if any)
INSERT INTO public.organizations (name, slug, description, owner_id)
VALUES (
  'Sportified',
  'sportified',
  'Default organization for existing events.',
  (SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role ORDER BY created_at LIMIT 1)
);

UPDATE public.events
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'sportified')
WHERE organization_id IS NULL;