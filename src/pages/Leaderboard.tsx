import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowRight } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  sport: string;
  status: string;
}

export default function Leaderboard() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("id,name,sport,status")
      .neq("status", "archived")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        setEvents((data as EventRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container py-8 sm:py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Leaderboards</h1>
          <p className="text-sm text-muted-foreground">
            Each tournament has its own leaderboard. Pick an event to see its rankings.
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">No events yet</h3>
          <p className="text-sm text-muted-foreground">Leaderboards appear once tournaments are live.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((e) => (
            <Link key={e.id} to={`/events/${e.id}/leaderboard`}>
              <Card className="p-4 flex items-center justify-between gap-4 transition-all hover:shadow-elevated">
                <div className="min-w-0">
                  <p className="font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{e.sport}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="capitalize">{e.status}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
