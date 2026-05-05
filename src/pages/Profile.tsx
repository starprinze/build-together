import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Save } from "lucide-react";
import { toast } from "sonner";

interface PredictionRow {
  id: string;
  prediction: "team_a" | "team_b" | "draw";
  created_at: string;
  match: {
    id: string;
    event_id: string;
    result: string | null;
    status: string;
    score_a: number | null;
    score_b: number | null;
    team_a: { name: string } | null;
    team_b: { name: string } | null;
  } | null;
}

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: prof }, { data: pts }, { data: preds }] = await Promise.all([
        supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle(),
        supabase.from("points").select("points").eq("user_id", user.id),
        supabase
          .from("predictions")
          .select(
            "id, prediction, created_at, match:match_id(id,event_id,result,status,score_a,score_b,team_a:team_a_id(name),team_b:team_b_id(name))",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      setUsername(prof?.username ?? "");
      setPoints((pts ?? []).reduce((s: number, p: any) => s + (p.points ?? 0), 0));
      setHistory((preds as any) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) return <div className="container py-20 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    const trimmed = username.trim();
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, username: trimmed || null }, { onConflict: "user_id" });
    setSavingName(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  return (
    <div className="container py-8 sm:py-12 max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-display font-bold">My Profile</h1>
        <Card className="px-4 py-2 flex items-center gap-2 bg-gradient-court text-primary-foreground shadow-court">
          <Trophy className="h-4 w-4" />
          <span className="font-display font-bold text-lg">{points}</span>
          <span className="text-xs uppercase tracking-wider opacity-80">pts</span>
        </Card>
      </div>

      <Card className="p-5 shadow-card">
        <form onSubmit={saveName} className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="username">Display name (shown on leaderboard)</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. CourtKing"
              maxLength={32}
            />
          </div>
          <Button type="submit" disabled={savingName} className="shadow-court">
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-border bg-muted/40">
          <h2 className="font-display font-semibold">Prediction history</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No predictions yet. <Link to="/" className="text-primary hover:underline">Find a match</Link> to predict.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((p) => {
              const m = p.match;
              if (!m) return null;
              const a = m.team_a?.name ?? "TBD";
              const b = m.team_b?.name ?? "TBD";
              const myLabel = p.prediction === "team_a" ? a : p.prediction === "team_b" ? b : "Draw";
              const settled = !!m.result;
              const correct = settled && m.result === p.prediction;
              return (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <Link to={`/events/${m.event_id}`} className="min-w-0 flex-1 hover:text-primary">
                    <div className="text-sm font-medium truncate">
                      {a} <span className="text-muted-foreground">vs</span> {b}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Picked: <span className="font-medium text-foreground">{myLabel}</span>
                      {settled && (
                        <>
                          {" · "}
                          Result: {m.score_a ?? 0}–{m.score_b ?? 0}
                        </>
                      )}
                    </div>
                  </Link>
                  {settled ? (
                    <Badge variant={correct ? "default" : "secondary"}>
                      {correct ? "+10" : "—"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
