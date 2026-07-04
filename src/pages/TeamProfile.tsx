import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Users, Calendar, MapPin } from "lucide-react";
import { TeamSquad } from "@/components/TeamSquad";

interface TeamRow {
  id: string;
  name: string;
  captain: string;
  department: string;
  event_id: string;
  logo_url: string | null;
  roster: string | null;
}
interface EventRow {
  id: string;
  name: string;
  sport: string;
  status: string;
  start_date: string;
  end_date: string;
}
interface MatchHistoryRow {
  id: string;
  event_id: string;
  round: number;
  status: string;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: string | null;
}

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [allSameNameTeams, setAllSameNameTeams] = useState<TeamRow[]>([]);
  const [history, setHistory] = useState<MatchHistoryRow[]>([]);
  const [eventsById, setEventsById] = useState<Record<string, EventRow>>({});
  const [teamsById, setTeamsById] = useState<Record<string, TeamRow>>({});
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from("teams").select("*").eq("id", id).maybeSingle();
      if (!t) {
        setLoading(false);
        return;
      }
      setTeam(t as TeamRow);

      const { data: ev } = await supabase.from("events").select("*").eq("id", t.event_id).maybeSingle();
      if (ev) setEvent(ev as EventRow);

      const { data: canMng } = await supabase.rpc("can_manage_event", { _event_id: t.event_id });
      setCanManage(!!canMng);

      // Find all teams with same name (cross-event identity by name)
      const { data: sameTeams } = await supabase
        .from("teams")
        .select("*")
        .ilike("name", t.name);
      const sameTeamsList = (sameTeams as TeamRow[]) ?? [];
      setAllSameNameTeams(sameTeamsList);
      const teamIds = sameTeamsList.map((x) => x.id);
      setTeamsById(Object.fromEntries(sameTeamsList.map((x) => [x.id, x])));

      // Fetch all matches involving any of those team ids
      if (teamIds.length) {
        const { data: ms } = await supabase
          .from("matches")
          .select("*")
          .or(teamIds.map((tid) => `team_a_id.eq.${tid},team_b_id.eq.${tid}`).join(","))
          .eq("status", "completed");
        setHistory((ms as MatchHistoryRow[]) ?? []);

        // Fetch events for those matches
        const eventIds = Array.from(new Set((ms ?? []).map((m: any) => m.event_id)));
        if (eventIds.length) {
          const { data: evs } = await supabase.from("events").select("*").in("id", eventIds);
          setEventsById(Object.fromEntries((evs ?? []).map((e: any) => [e.id, e])));
        }

        // Also fetch opponent team names
        const opponentIds = Array.from(
          new Set(
            (ms ?? [])
              .flatMap((m: any) => [m.team_a_id, m.team_b_id])
              .filter((x): x is string => !!x && !teamIds.includes(x))
          )
        );
        if (opponentIds.length) {
          const { data: opps } = await supabase.from("teams").select("*").in("id", opponentIds);
          setTeamsById((prev) => ({
            ...prev,
            ...Object.fromEntries((opps ?? []).map((x: any) => [x.id, x])),
          }));
        }
      }
      setLoading(false);
    })();
  }, [id]);

  const teamIdSet = useMemo(() => new Set(allSameNameTeams.map((x) => x.id)), [allSameNameTeams]);

  const { wins, losses } = useMemo(() => {
    let w = 0;
    let l = 0;
    history.forEach((m) => {
      if (!m.winner_id) return;
      const involved = (m.team_a_id && teamIdSet.has(m.team_a_id)) || (m.team_b_id && teamIdSet.has(m.team_b_id));
      if (!involved) return;
      if (teamIdSet.has(m.winner_id)) w++;
      else l++;
    });
    return { wins: w, losses: l };
  }, [history, teamIdSet]);

  const eventsPlayed = useMemo(
    () => new Set(history.map((m) => m.event_id)).size,
    [history]
  );

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-display font-bold mb-2">Team not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Back to events</Link>
        </Button>
      </div>
    );
  }

  const rosterList = (team.roster ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sortedHistory = [...history].sort((a, b) => {
    const ea = eventsById[a.event_id]?.start_date ?? "";
    const eb = eventsById[b.event_id]?.start_date ?? "";
    return eb.localeCompare(ea) || b.round - a.round;
  });

  return (
    <div className="container py-8 max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={event ? `/events/${event.id}` : "/"}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {event ? `Back to ${event.name}` : "Back"}
        </Link>
      </Button>

      <Card className="p-6 sm:p-8 shadow-card mb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-2 ring-border shadow-court">
            {team.logo_url && <AvatarImage src={team.logo_url} alt={`${team.name} logo`} />}
            <AvatarFallback className="bg-gradient-court text-primary-foreground font-display font-bold text-2xl">
              {initials(team.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{team.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {team.department}
              </span>
              <span>·</span>
              <span>Captain: <span className="text-foreground font-medium">{team.captain}</span></span>
            </div>
            {event && (
              <Badge variant="secondary" className="mt-3">
                <Calendar className="h-3 w-3 mr-1" />
                {event.name} · {event.sport}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Wins" value={wins} accent />
        <StatCard label="Losses" value={losses} />
        <StatCard label="Events played" value={eventsPlayed} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Roster</h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {rosterList.length} {rosterList.length === 1 ? "player" : "players"}
            </span>
          </div>
          {rosterList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roster listed yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rosterList.map((p, i) => (
                <li key={i} className="py-2 flex items-center gap-3 text-sm">
                  <span className="w-6 text-xs font-mono text-muted-foreground tabular-nums">{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Match history</h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {sortedHistory.length} played
            </span>
          </div>
          {sortedHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed matches yet.</p>
          ) : (
            <ul className="space-y-2">
              {sortedHistory.map((m) => {
                const isA = m.team_a_id && teamIdSet.has(m.team_a_id);
                const opponentId = isA ? m.team_b_id : m.team_a_id;
                const myScore = isA ? m.score_a : m.score_b;
                const oppScore = isA ? m.score_b : m.score_a;
                const won = m.winner_id && teamIdSet.has(m.winner_id);
                const opp = opponentId ? teamsById[opponentId] : null;
                const ev = eventsById[m.event_id];
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-md border border-border bg-card"
                  >
                    <Badge variant={won ? "default" : "outline"} className="w-10 justify-center">
                      {won ? "W" : "L"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        vs {opp?.name ?? "Unknown"}
                      </div>
                      {ev && (
                        <div className="text-xs text-muted-foreground truncate">
                          {ev.name} · R{m.round}
                        </div>
                      )}
                    </div>
                    <div className="font-mono tabular-nums text-sm">
                      <span className={won ? "font-bold text-primary" : ""}>{myScore ?? "—"}</span>
                      <span className="text-muted-foreground mx-1">–</span>
                      <span>{oppScore ?? "—"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-5 shadow-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-display font-semibold">
        {label}
      </div>
      <div className={`text-3xl font-display font-bold mt-1 ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
