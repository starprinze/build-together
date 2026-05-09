import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PredictionMatch {
  id: string;
  event_id: string;
  prediction_deadline: string | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
}

export default function Predictions() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<PredictionMatch[]>([]);

  useEffect(() => {
    supabase
      .from("matches")
      .select("id,event_id,prediction_deadline,team_a:team_a_id(name),team_b:team_b_id(name)")
      .eq("status", "pending")
      .is("result", null)
      .order("prediction_deadline", { ascending: true, nullsFirst: false })
      .limit(12)
      .then(({ data }) => setMatches((((data as unknown) as PredictionMatch[]) ?? [])));
  }, []);

  return (
    <div className="container py-8 sm:py-12 space-y-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Predictions</h1>
        <p className="mt-2 text-muted-foreground">
          Pick winners before kickoff, earn points, and rise up the leaderboard.
        </p>
      </div>

      {!user && (
        <Card className="p-6 sm:p-8 border-border bg-card/70">
          <div className="flex items-start gap-4">
            <div className="grid place-items-center h-11 w-11 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold">Sign in to start predicting and compete on the leaderboard.</h2>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button asChild><Link to="/login?redirect=/predictions">Sign In</Link></Button>
                <Button asChild variant="outline"><Link to="/login?mode=signup&redirect=/predictions">Create Account</Link></Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <Card key={match.id} className="p-5">
            <p className="text-sm font-medium truncate">{match.team_a?.name ?? "TBD"} vs {match.team_b?.name ?? "TBD"}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {match.prediction_deadline
                ? `Closes ${new Date(match.prediction_deadline).toLocaleString()}`
                : "Open for predictions"}
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
              <Link to={`/events/${match.event_id}`}>
                Open match <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}