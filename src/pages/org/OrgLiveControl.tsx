import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MatchTimeline } from "@/components/MatchTimeline";
import { Radio, RefreshCw, RotateCcw, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LIVE_PHASES,
  ADMIN_OUTCOMES,
  statusMeta,
  type MatchStatus,
} from "@/lib/matchLifecycle";

interface TeamRef {
  id: string;
  name: string;
}
interface LiveMatch {
  id: string;
  round: number;
  match_number: number;
  status: string;
  score_a: number | null;
  score_b: number | null;
  team_a: TeamRef | null;
  team_b: TeamRef | null;
}

export default function OrgLiveControl() {
  const { isSuperAdmin, managedOrgId, loading } = useAuth();
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [fetching, setFetching] = useState(false);
  const [active, setActive] = useState<LiveMatch | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [saving, setSaving] = useState(false);

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
      if (list.length) setEventId(list[0].id);
    });
  }, [isSuperAdmin, managedOrgId, loading]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setFetching(true);
    const { data } = await supabase
      .from("matches")
      .select(
        "id,round,match_number,status,score_a,score_b,team_a:team_a_id(id,name),team_b:team_b_id(id,name)"
      )
      .eq("event_id", eventId)
      .order("round")
      .order("match_number");
    setMatches((data as unknown as LiveMatch[]) ?? []);
    setFetching(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`live-control-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `event_id=eq.${eventId}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, load]);

  const openMatch = (m: LiveMatch) => {
    setActive(m);
    setScoreA(m.score_a != null ? String(m.score_a) : "");
    setScoreB(m.score_b != null ? String(m.score_b) : "");
  };

  const setStatus = async (m: LiveMatch, status: MatchStatus) => {
    setSaving(true);
    const { error } = await supabase.from("matches").update({ status }).eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success(`Match ${status}`);
    setSaving(false);
    load();
  };

  const saveScore = async () => {
    if (!active) return;
    setSaving(true);
    const a = scoreA !== "" ? Number(scoreA) : null;
    const b = scoreB !== "" ? Number(scoreB) : null;
    const payload: {
      score_a: number | null;
      score_b: number | null;
      winner_id?: string | null;
    } = { score_a: a, score_b: b };
    if (active.status === "completed") {
      payload.winner_id =
        a != null && b != null
          ? a > b
            ? active.team_a?.id
            : b > a
              ? active.team_b?.id
              : null
          : null;
    }
    const { error } = await supabase.from("matches").update(payload).eq("id", active.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Score updated");
      load();
    }
    setSaving(false);
  };

  const finishMatch = async (m: LiveMatch) => {
    const a = m.score_a ?? 0;
    const b = m.score_b ?? 0;
    const winner = a > b ? m.team_a?.id : b > a ? m.team_b?.id : null;
    const { error } = await supabase
      .from("matches")
      .update({ status: "completed", winner_id: winner })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success("Match finished");
    load();
  };

  const live = matches.filter((m) => m.status === "live");
  const ready = matches.filter((m) => m.status === "pending" && m.team_a && m.team_b);
  const finished = matches.filter((m) => m.status === "completed");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-destructive" /> Live Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Set matches live, update scores, finish matches.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={fetching}>
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

      {live.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-destructive flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Live now ({live.length})
          </h2>
          {live.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              onOpen={openMatch}
              onFinish={finishMatch}
              onStatus={setStatus}
              saving={saving}
            />
          ))}
        </section>
      )}

      {ready.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ready to start ({ready.length})
          </h2>
          {ready.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              onOpen={openMatch}
              onFinish={finishMatch}
              onStatus={setStatus}
              saving={saving}
            />
          ))}
        </section>
      )}

      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Finished ({finished.length})
          </h2>
          {finished.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              onOpen={openMatch}
              onFinish={finishMatch}
              onStatus={setStatus}
              saving={saving}
            />
          ))}
        </section>
      )}

      {!fetching && matches.length === 0 && (
        <Card className="p-12 text-center">
          <Radio className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No matches yet. Generate fixtures first.</p>
        </Card>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {active?.team_a?.name ?? "TBD"} vs {active?.team_b?.name ?? "TBD"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <Label className="text-xs">{active?.team_a?.name}</Label>
                <Input
                  type="number"
                  min="0"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="text-center text-xl font-bold h-12"
                />
              </div>
              <div className="text-muted-foreground font-bold pb-3">—</div>
              <div>
                <Label className="text-xs">{active?.team_b?.name}</Label>
                <Input
                  type="number"
                  min="0"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="text-center text-xl font-bold h-12"
                />
              </div>
            </div>
            <Button onClick={saveScore} disabled={saving} className="w-full shadow-court">
              {saving ? "Saving…" : "Update score"}
            </Button>
            <div className="flex flex-wrap gap-2">
              {active?.status !== "live" && (
                <Button size="sm" variant="outline" onClick={() => active && setStatus(active, "live")}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Set live
                </Button>
              )}
              {active?.status === "live" && (
                <Button size="sm" variant="outline" onClick={() => active && finishMatch(active)}>
                  <Square className="h-3.5 w-3.5 mr-1" /> Finish
                </Button>
              )}
              {active?.status === "completed" && (
                <Button size="sm" variant="outline" onClick={() => active && setStatus(active, "live")}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reopen
                </Button>
              )}
            </div>
            {active && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Timeline</h3>
                <MatchTimeline matchId={active.id} isAdmin />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchRow({
  match,
  onOpen,
  onFinish,
  onStatus,
  saving,
}: {
  match: LiveMatch;
  onOpen: (m: LiveMatch) => void;
  onFinish: (m: LiveMatch) => void;
  onStatus: (m: LiveMatch, status: MatchStatus) => void;
  saving: boolean;
}) {
  const isLive = match.status === "live";
  const isDone = match.status === "completed";
  return (
    <Card
      className={cn(
        "p-4 shadow-card relative overflow-hidden",
        isLive && "ring-1 ring-destructive/40"
      )}
    >
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-destructive to-transparent animate-pulse" />
      )}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Round {match.round} · #{match.match_number}
        </span>
        <span
          className={cn(
            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
            isLive
              ? "bg-destructive/15 text-destructive border-destructive/30"
              : isDone
                ? "bg-green-500/15 text-green-600 border-green-500/30"
                : "bg-muted text-muted-foreground border-transparent"
          )}
        >
          {isLive ? "● LIVE" : match.status}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
        <div className="font-semibold text-sm truncate">{match.team_a?.name ?? "TBD"}</div>
        <div className="font-bold text-xl tabular-nums px-2">
          {isLive || isDone ? `${match.score_a ?? 0} – ${match.score_b ?? 0}` : "vs"}
        </div>
        <div className="font-semibold text-sm truncate text-right">{match.team_b?.name ?? "TBD"}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap border-t border-border pt-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => onOpen(match)}
        >
          {isLive ? "Update score" : isDone ? "View/reopen" : "Manage"}
        </Button>
        {!isLive && !isDone && match.team_a && match.team_b && (
          <Button
            size="sm"
            className="h-8 text-xs bg-green-500/15 text-green-600 border border-green-500/40 hover:bg-green-500/25"
            onClick={() => onStatus(match, "live")}
            disabled={saving}
          >
            <Play className="h-3 w-3 mr-1" /> Go live
          </Button>
        )}
        {isLive && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onFinish(match)}
            disabled={saving}
          >
            <Square className="h-3 w-3 mr-1" /> Finish
          </Button>
        )}
      </div>
    </Card>
  );
}
