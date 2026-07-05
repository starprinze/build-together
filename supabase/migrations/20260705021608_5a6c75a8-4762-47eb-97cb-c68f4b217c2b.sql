-- Audit log for role & permission changes
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_user_id uuid,
  target_email text,
  organization_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_target ON public.audit_log (target_user_id);

-- Allow organization managers to create announcement / reminder notifications
-- for events they manage (super-admins keep their existing broad insert policy).
CREATE POLICY "Org managers can create event notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (event_id IS NOT NULL AND public.can_manage_event(event_id));

-- Org managers can view notifications tied to events they manage.
CREATE POLICY "Org managers can view event notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (event_id IS NOT NULL AND public.can_manage_event(event_id));