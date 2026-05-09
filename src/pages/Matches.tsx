import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchItem {
  id: string;
  event_id: string;
  round: number;
  match_number: number;
  status: string;
  score_a: number | null;
  score_b: number | null;
  prediction_deadline: string | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
}

export default function Matches() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("matches")
      .select("id,event_id,round,match_number,status,score_a,score_b,prediction_deadline,team_a:team_a_id(name),team_b:team_b_id(name)")
      .order("created_at", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (cancelled) return;
        setMatches((data as MatchItem[]) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container py-8 sm:py-12">
      <div className="max-w-2xl mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Matches</h1>
        <p className="mt-2 text-muted-foreground">Follow live games, upcoming kickoffs, and recent results.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No matches available yet.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => {
            const live = match.status === "pending" && (match.score_a !== null || match.score_b !== null);
            return (
              <Link key={match.id} to={`/events/${match.event_id}`}>
                <Card className="p-5 h-full transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      Round {match.round} · #{match.match_number}
                    </span>
                    <Badge variant={live ? "default" : "outline"} className="text-[10px] uppercase">
                      {live ? (
                        <span className="inline-flex items-center gap-1"><Radio className="h-3 w-3" /> Live</span>
                      ) : match.status}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium truncate">{match.team_a?.name ?? "TBD"}</span>
                      <span className="font-display font-bold tabular-nums">{match.score_a ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium truncate">{match.team_b?.name ?? "TBD"}</span>
                      <span className="font-display font-bold tabular-nums">{match.score_b ?? "—"}</span>
                    </div>
                  </div>
                  {match.prediction_deadline && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Predictions close {new Date(match.prediction_deadline).toLocaleString()}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}