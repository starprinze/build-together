import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

interface MatchRow {
  id: string;
  round: number;
  match_number: number;
  status: string;
  event_name: string;
  predictions: number;
}

export default function OrgPredictions() {
  const { managedOrgId, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let eq = supabase.from("events").select("id,name").neq("status", "archived");
      if (!isSuperAdmin && managedOrgId) eq = eq.eq("organization_id", managedOrgId);
      const { data: evs } = await eq;
      const eventMap: Record<string, string> = {};
      (evs ?? []).forEach((e: any) => { eventMap[e.id] = e.name; });
      const eventIds = Object.keys(eventMap);

      if (!eventIds.length) {
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const { data: matches } = await supabase
        .from("matches")
        .select("id,round,match_number,status,event_id")
        .in("event_id", eventIds)
        .order("round", { ascending: true });
      const matchList = (matches ?? []) as any[];

      const counts: Record<string, number> = {};
      if (matchList.length) {
        const { data: preds } = await supabase
          .from("predictions")
          .select("match_id")
          .in("match_id", matchList.map((m) => m.id));
        (preds ?? []).forEach((p: any) => {
          counts[p.match_id] = (counts[p.match_id] ?? 0) + 1;
        });
      }

      const built = matchList
        .map((m) => ({
          id: m.id,
          round: m.round,
          match_number: m.match_number,
          status: m.status,
          event_name: eventMap[m.event_id] ?? "Event",
          predictions: counts[m.id] ?? 0,
        }))
        .sort((a, b) => b.predictions - a.predictions);

      setRows(built);
      setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
      setLoading(false);
    };
    void load();
  }, [managedOrgId, isSuperAdmin]);

  if (loading) return <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Predictions</h1>
          <p className="text-sm text-muted-foreground">Fan engagement across your matches.</p>
        </div>
        <Card className="px-4 py-2 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="font-display font-bold text-lg">{total}</span>
          <span className="text-xs text-muted-foreground">total predictions</span>
        </Card>
      </header>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No matches with predictions yet.</Card>
      ) : (
        <Card className="divide-y divide-border p-0">
          {rows.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{m.event_name}</div>
                <div className="text-xs text-muted-foreground">Round {m.round} · Match {m.match_number}</div>
              </div>
              <Badge variant="secondary" className="capitalize hidden sm:inline-flex">{m.status}</Badge>
              <div className="text-right">
                <div className="font-display font-bold">{m.predictions}</div>
                <div className="text-[11px] text-muted-foreground">predictions</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
