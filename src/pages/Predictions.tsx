import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventRow {
  id: string;
  name: string;
  sport: string;
  status: string;
}

export default function Predictions() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    supabase
      .from("events")
      .select("id,name,sport,status")
      .order("start_date", { ascending: false })
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, []);

  return (
    <div className="container py-8 sm:py-12 space-y-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Predictions</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a tournament, predict its matches, and climb that event’s own leaderboard.
        </p>
      </div>

      {!user && (
        <Card className="p-6 sm:p-8 border-border bg-card/70">
          <div className="flex items-start gap-4">
            <div className="grid place-items-center h-11 w-11 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold">
                Sign in to start predicting and compete within each event.
              </h2>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link to="/login?redirect=/predictions">Sign In</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/login?mode=signup&redirect=/predictions">Create Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <Card key={e.id} className="p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{e.name}</p>
              <Badge variant="outline" className="capitalize text-[10px] shrink-0">{e.status}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground capitalize">{e.sport}</p>
            <Button asChild variant="ghost" size="sm" className="mt-4 px-0 self-start">
              <Link to={`/events/${e.id}/predictions`}>
                Predict matches <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
