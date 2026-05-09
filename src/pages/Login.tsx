import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, refreshRole } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectTo = searchParams.get("redirect") || "/profile";
  const adminMode = searchParams.get("admin") === "1" || location.pathname === "/admin/login";

  const refreshAdminExists = async () => {
    const { data, error } = await supabase.rpc("admin_exists");
    if (!error) setAdminExists(!!data);
  };

  useEffect(() => {
    refreshAdminExists();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        if (adminMode) {
          await refreshRole();
          if (isAdmin) {
            navigate("/admin", { replace: true });
            return;
          }

          const { data } = await supabase.rpc("admin_exists");
          if (!data) {
            setAdminExists(false);
            return;
          }

          toast.error("This account does not have organizer access.");
          navigate(redirectTo, { replace: true });
          return;
        }

        navigate(redirectTo, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in now.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth error");
    } finally {
      setLoading(false);
    }
  };

  const claimFirstAdmin = async () => {
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      if (data === true) {
        await refreshRole();
        toast.success("You are now the first admin");
        navigate("/admin");
      } else {
        toast.info("An admin already exists. Ask them to grant you access.");
        await refreshAdminExists();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Could not claim admin");
    } finally {
      setClaiming(false);
    }
  };

  const showBootstrap = !!user && !isAdmin && adminExists === false;

  return (
    <div className="container py-16 max-w-md">
      <Link to="/" className="flex items-center justify-center gap-2 mb-8 font-display font-bold text-xl">
        <span className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
          <Trophy className="h-5 w-5" />
        </span>
        Campus Sports
      </Link>

      {showBootstrap && (
        <Card className="p-6 mb-6 border-primary/40 shadow-elevated">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Claim first admin</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            No admin account exists yet. As the signed-in user{" "}
            <span className="font-medium text-foreground">{user?.email}</span>, you
            can claim the admin role now. This option disappears once an admin exists.
          </p>
          <Button onClick={claimFirstAdmin} disabled={claiming} className="w-full shadow-court">
            {claiming ? "Claiming…" : "Make me the first admin"}
          </Button>
        </Card>
      )}

      <Card className="p-8 shadow-elevated">
        <h1 className="text-2xl font-display font-bold mb-1">
          {mode === "signin"
            ? adminMode
              ? "Organizer sign in"
              : "Sign in to Sportified"
            : adminMode
              ? "Create organizer account"
              : "Create your Sportified account"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin"
            ? adminMode
              ? "Sign in with an organizer-approved account to manage events, teams, and fixtures."
              : "Sign in to make predictions, track your history, and climb the leaderboard."
            : adminMode
              ? adminExists === false
                ? "After signing up, sign in and claim the first organizer role."
                : "After signing up, ask an existing organizer to grant you access."
              : "Create an account to start predicting and compete for points."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full shadow-court" disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm text-primary hover:underline w-full text-center"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
}
