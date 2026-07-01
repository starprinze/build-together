import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, CircleCheckBig } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
      }
    });
    // If a session already exists (link handled before listener attached)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-8 font-display font-bold text-xl"
        >
          <span className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
            <Trophy className="h-5 w-5" />
          </span>
          Sportified
        </Link>

        <Card className="p-8 shadow-elevated">
          {done ? (
            <div className="text-center space-y-4">
              <div className="grid place-items-center h-14 w-14 rounded-full bg-primary/10 mx-auto">
                <CircleCheckBig className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold">Password updated</h1>
              <p className="text-sm text-muted-foreground">
                Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold mb-1">Set a new password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {ready
                  ? "Choose a strong password for your account."
                  : "Open this page from the reset link in your email to continue."}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full shadow-court"
                  disabled={loading || !ready}
                >
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
              <Link
                to="/login"
                className="mt-4 block text-sm text-muted-foreground hover:text-foreground text-center"
              >
                Back to sign in
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
