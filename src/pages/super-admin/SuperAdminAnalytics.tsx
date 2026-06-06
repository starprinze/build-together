import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OrgBreakdown {
  id: string;
  name: string;
  events: number;
}

interface SportBreakdown {
  sport: string;
  count: number;
}

export default function SuperAdminAnalytics() {
  const [orgRows, setOrgRows] = useState<OrgBreakdown[]>([]);
  const [sports, setSports] = useState<SportBreakdown[]>([]);
  const [statusTally, setStatusTally] = useState<Record<string, number>>({});
  const [predTotal, setPredTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [{ data: orgs }, { data: events }, predRes] = await Promise.all([
        supabase.from("organizations").select("id,name"),
        supabase.from("events").select("organization_id,sport,status"),
        supabase.from("predictions").select("id", { count: "exact", head: true }),
      ]);
      const evlist = events ?? [];

      const evByOrg: Record<string, number> = {};
      const sportTally: Record<string, number> = {};
      const status: Record<string, number> = {};
      evlist.forEach((e: any) => {
        if (e.organization_id) evByOrg[e.organization_id] = (evByOrg[e.organization_id] ?? 0) + 1;
        if (e.sport) sportTally[e.sport] = (sportTally[e.sport] ?? 0) + 1;
        if (e.status) status[e.status] = (status[e.status] ?? 0) + 1;
      });

      setOrgRows(
        (orgs ?? [])
          .map((o: any) => ({ id: o.id, name: o.name, events: evByOrg[o.id] ?? 0 }))
          .sort((a, b) => b.events - a.events),
      );
      setSports(
        Object.entries(sportTally)
          .map(([sport, count]) => ({ sport, count }))
          .sort((a, b) => b.count - a.count),
      );
      setStatusTally(status);
      setPredTotal(predRes.count ?? 0);
    };
    void load();
  }, []);

  const maxOrg = Math.max(1, ...orgRows.map((o) => o.events));
  const maxSport = Math.max(1, ...sports.map((s) => s.count));

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-2xl font-display font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform-wide engagement and tournament distribution.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total predictions", value: predTotal },
          { label: "Upcoming", value: statusTally.upcoming ?? 0 },
          { label: "Ongoing", value: statusTally.ongoing ?? 0 },
          { label: "Completed", value: statusTally.completed ?? 0 },
        ].map((s) => (
          <Card key={s.label} className="p-4 shadow-card">
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-display font-semibold mb-4">Events per organization</h2>
        {orgRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        ) : (
          <ul className="space-y-3">
            {orgRows.map((o) => (
              <li key={o.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{o.name}</span>
                  <span className="text-muted-foreground">{o.events}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(o.events / maxOrg) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold mb-4">Popular sports</h2>
        {sports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sports.map((s) => (
              <Badge key={s.sport} variant="secondary" className="text-sm">
                {s.sport}
                <span className="ml-1.5 text-muted-foreground">
                  {Math.round((s.count / maxSport) * 100) === 100 ? "★ " : ""}{s.count}
                </span>
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
