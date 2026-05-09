import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshRole: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchRole = useCallback(async (uid: string | null) => {
    if (!uid) {
      setIsAdmin(false);
      return;
    }
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    if (error) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(!!data);
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

  return (
    <Ctx.Provider value={{ user, session, isAdmin, loading, signOut, refreshRole }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
