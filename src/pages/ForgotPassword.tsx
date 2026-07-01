import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send reset email");
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
          {sent ? (
            <div className="text-center space-y-4">
              <div className="grid place-items-center h-14 w-14 rounded-full bg-primary/10 mx-auto">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a reset link to <strong>{email}</strong>. Check your inbox.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-primary hover:underline block mx-auto"
              >
                Try again
              </button>
              <Link
                to="/login"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold mb-1">Forgot password?</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full shadow-court" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
              <Link
                to="/login"
                className="mt-4 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
