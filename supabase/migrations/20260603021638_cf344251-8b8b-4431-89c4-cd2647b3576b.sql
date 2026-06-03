-- 1. Org role enum + members table
CREATE TYPE public.org_role AS ENUM ('organizer', 'staff', 'viewer');

CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = _org_id
        AND user_id = auth.uid()
        AND role IN ('organizer', 'staff')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_event(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_org((SELECT organization_id FROM public.events WHERE id = _event_id));
$$;

-- 3. RLS for organization_members
CREATE POLICY "Members can view their org memberships"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.can_manage_org(organization_id));

CREATE POLICY "Org managers can add members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Org managers can update members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (public.can_manage_org(organization_id))
WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Org managers can remove members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (public.can_manage_org(organization_id));

-- 4. Additive management policies for org owners/members (super-admin policies remain)
CREATE POLICY "Org managers can manage their events"
ON public.events
FOR ALL
TO authenticated
USING (organization_id IS NOT NULL AND public.can_manage_org(organization_id))
WITH CHECK (organization_id IS NOT NULL AND public.can_manage_org(organization_id));

CREATE POLICY "Org managers can manage their teams"
ON public.teams
FOR ALL
TO authenticated
USING (public.can_manage_event(event_id))
WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "Org managers can manage their matches"
ON public.matches
FOR ALL
TO authenticated
USING (public.can_manage_event(event_id))
WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "Org managers can manage their event photos"
ON public.event_photos
FOR ALL
TO authenticated
USING (public.can_manage_event(event_id))
WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "Org managers can manage their match events"
ON public.match_events
FOR ALL
TO authenticated
USING (public.can_manage_event((SELECT event_id FROM public.matches WHERE id = match_id)))
WITH CHECK (public.can_manage_event((SELECT event_id FROM public.matches WHERE id = match_id)));