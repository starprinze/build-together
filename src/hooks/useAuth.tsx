import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  /** True if the user holds the global super-admin (admin) role. */
  isAdmin: boolean;
  /** Alias for isAdmin — the platform super administrator. */
  isSuperAdmin: boolean;
  /** The organization this user can manage (owned, or organizer/staff member). */
  managedOrgId: string | null;
  /** The user's role within their managed organization, if a member. */
  orgRole: "owner" | "organizer" | "staff" | "viewer" | null;
  /** True if the user can reach the control center (super admin or org manager). */
  canManage: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  isSuperAdmin: false,
  managedOrgId: null,
  orgRole: null,
  canManage: false,
  loading: true,
  signOut: async () => {},
  refreshRole: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [managedOrgId, setManagedOrgId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<AuthCtx["orgRole"]>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchRole = useCallback(async (uid: string | null) => {
    if (!uid) {
      setIsAdmin(false);
      setManagedOrgId(null);
      setOrgRole(null);
      return;
    }

    // Super-admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!roleRow);

    // Organization the user owns (preferred) …
    const { data: owned } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (owned?.id) {
      setManagedOrgId(owned.id);
      setOrgRole("owner");
      return;
    }

    // … otherwise a membership.
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membership?.organization_id) {
      setManagedOrgId(membership.organization_id);
      setOrgRole((membership.role as AuthCtx["orgRole"]) ?? "viewer");
    } else {
      setManagedOrgId(null);
      setOrgRole(null);
    }
  }, []);

  const refreshRole = useCallback(async () => {
    await fetchRole(userIdRef.current);
  }, [fetchRole]);

  const applySession = useCallback(
    async (sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      userIdRef.current = sess?.user?.id ?? null;

      if (!sess?.user) {
        setIsAdmin(false);
        setManagedOrgId(null);
        setOrgRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchRole(sess.user.id);
      setLoading(false);
    },
    [fetchRole],
  );

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setTimeout(() => {
        void applySession(sess);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      void applySession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, [applySession]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isManager = orgRole === "owner" || orgRole === "organizer" || orgRole === "staff";
  const canManage = isAdmin || isManager;

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        isAdmin,
        isSuperAdmin: isAdmin,
        managedOrgId,
        orgRole,
        canManage,
        loading,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
