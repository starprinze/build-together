import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface FixtureRow {
  id: string;
  event_id: string;
  round: number;
  match_number: number;
  status: string;
  prediction_deadline: string | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
}

export default function Fixtures() {
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);

  useEffect(() => {
    supabase
      .from("matches")
      .select("id,event_id,round,match_number,status,prediction_deadline,team_a:team_a_id(name),team_b:team_b_id(name)")
      .order("prediction_deadline", { ascending: true, nullsFirst: false })
      .limit(24)
      .then(({ data }) => setFixtures((((data as unknown) as FixtureRow[]) ?? [])));
  }, []);

  return (
    <div className="container py-8 sm:py-12">
      <div className="max-w-2xl mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Fixtures</h1>
        <p className="mt-2 text-muted-foreground">See what’s coming up and jump into each tournament page for live detail.</p>
      </div>
      <div className="grid gap-3">
        {fixtures.map((fixture) => (
          <Link key={fixture.id} to={`/events/${fixture.event_id}`}>
            <Card className="p-4 flex items-center justify-between gap-4 transition-all hover:shadow-elevated">
              <div className="min-w-0">
                <p className="font-medium truncate">{fixture.team_a?.name ?? "TBD"} vs {fixture.team_b?.name ?? "TBD"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Round {fixture.round} · Match #{fixture.match_number}
                  {fixture.prediction_deadline ? ` · ${new Date(fixture.prediction_deadline).toLocaleString()}` : ""}
                </p>
              </div>
              <Badge variant="outline" className="capitalize shrink-0">{fixture.status}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}