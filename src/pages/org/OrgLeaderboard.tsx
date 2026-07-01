import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Crown, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Row {
  user_id: string;
  username: string;
  total_points: number;
  correct_predictions: number;
}

export default function OrgLeaderboard() {
  const { isSuperAdmin, managedOrgId, loading } = useAuth();
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (loading) return;
    let q = supabase
      .from("events")
      .select("id,name")
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (!isSuperAdmin && managedOrgId) q = q.eq("organization_id", managedOrgId);
    else if (!isSuperAdmin && !managedOrgId) return;
    q.then(({ data }) => {
      const list = data ?? [];
      setEvents(list);
      if (list.length && !eventId) setEventId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, managedOrgId, loading]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("event_leaderboard")
      .select("user_id,username,total_points,correct_predictions")
      .eq("event_id", eventId)
      .order("total_points", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setRows((data as Row[]) ?? []);
    setFetching(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-display font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Prediction rankings for the selected event.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={fetching || !eventId}>
          <RefreshCw className={cn("h-4 w-4 mr-1", fetching && "animate-spin")} /> Refresh
        </Button>
      </div>

      <Select value={eventId} onValueChange={setEventId}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Select event…" />
        </SelectTrigger>
        <SelectContent>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {fetching ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No points yet. Rankings appear as predictions are scored.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {rows.map((r, i) => (
            <div
              key={r.user_id}
              className={cn("flex items-center gap-4 px-5 py-3", i === 0 && "bg-yellow-500/5")}
            >
              <div className="w-6 flex items-center justify-center shrink-0">
                {i === 0 ? (
                  <Crown className="h-4 w-4 text-yellow-500" />
                ) : i === 1 ? (
                  <span className="text-xs font-bold text-zinc-400">2</span>
                ) : i === 2 ? (
                  <span className="text-xs font-bold text-amber-600">3</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{r.username}</span>
                <span className="text-[11px] text-muted-foreground">
                  {r.correct_predictions} correct
                </span>
              </div>
              <Badge variant={i < 3 ? "default" : "secondary"} className="font-mono">
                {r.total_points} pts
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
