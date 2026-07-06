import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Radio, Calendar, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BracketView, MatchRow, EventInfo } from "@/components/BracketView";
import { GroupStagePanel } from "@/components/GroupStagePanel";
import { cn } from "@/lib/utils";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchTimeline } from "@/components/MatchTimeline";
import { MatchReactions } from "@/components/MatchReactions";
import { MatchPrediction } from "@/components/MatchPrediction";
import { EventLeaderboard } from "@/components/EventLeaderboard";
import { computeStandings } from "@/lib/standings";
import { getSportProfile } from "@/lib/sports";
import { lazyWithRetry } from "@/lib/moduleLoadRecovery";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const EventGallery = lazyWithRetry(() =>
  import("@/components/EventGallery").then((m) => ({ default: m.EventGallery })),
);

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const s = new Date(start).toLocaleDateString(undefined, opts);
  if (!end || end === start) return s;
  const e = new Date(end).toLocaleDateString(undefined, opts);
  return `${s} – ${e}`;
}

async function shareEvent(name: string) {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: name, url });
      return;
    }
  } catch { /* user cancelled */ }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  } catch {
    toast.error("Could not copy link");
  }
}

export default function EventBracket({ defaultTab = "bracket" }: { defaultTab?: string }) {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [openMatch, setOpenMatch] = useState<MatchRow | null>(null);

  const loadMatches = useCallback(async () => {
    if (!id) return;
    const { data: mts } = await supabase
      .from("matches")
      .select(
        "*, team_a:team_a_id(id,name,department), team_b:team_b_id(id,name,department), winner:winner_id(id,name)",
      )
      .eq("event_id", id)
      .order("round")
      .order("match_number");
    setMatches((mts as any) ?? []);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [{ data: ev }, { count }] = await Promise.all([
        supabase
          .from("events")
          .select("id,name,sport,start_date,end_date,status")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("teams").select("id", { count: "exact", head: true }).eq("event_id", id),
      ]);
      if (cancelled) return;
      setEvent(ev as EventInfo | null);
      setTeamCount(count ?? 0);
      await loadMatches();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadMatches]);

  // Realtime: re-fetch matches (with joins) on any change for this event.
  // Debounced so a burst of live score updates triggers a single refetch.
  useEffect(() => {
    if (!id) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`matches-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `event_id=eq.${id}` },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => loadMatches(), 250);
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [id, loadMatches]);

  if (loading)
    return <div className="container py-20 text-center text-muted-foreground">Loading bracket…</div>;
  if (!event) return <div className="container py-20 text-center">Event not found.</div>;

  const totalRounds = matches.length ? Math.max(...matches.map((m) => m.round)) : 0;
  const finalMatch = matches.find((m) => m.round === totalRounds);
  const champion = totalRounds > 0 && finalMatch?.status === "completed" ? finalMatch.winner : null;
  const sportProfile = getSportProfile(event.sport);
  const standings = computeStandings(matches, sportProfile);
  const matchIds = matches.map((m) => m.id);
  const predictableMatches = matches.filter((m) => m.team_a && m.team_b);
  // Group-stage fixtures must never appear inside the knockout bracket.
  const groupMatches = matches.filter((m) => !!m.group_id || m.bracket === "group");
  const knockoutMatches = matches.filter((m) => !(m.group_id || m.bracket === "group"));
  const hasGroups = groupMatches.length > 0;

  return (
    <div className="container py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <Badge className="mb-2 bg-accent text-accent-foreground border-0 capitalize">{event.sport}</Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-bold break-words">{event.name}</h1>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {formatDateRange(event.start_date, event.end_date) && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {formatDateRange(event.start_date, event.end_date)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {teamCount} team{teamCount === 1 ? "" : "s"}
            </span>
            <Badge variant="outline" className="capitalize text-xs">
              {event.status}
            </Badge>
            {live && (
              <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
                <Radio className="h-3 w-3 animate-pulse" /> Live updates
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shareEvent(event.name)}>
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>
      </div>
      {champion && (
        <Card className="px-5 py-4 mb-6 bg-gradient-court text-primary-foreground shadow-court flex items-center gap-3">
          <Trophy className="h-7 w-7" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Champion</div>
            <div className="font-display font-bold text-lg">{champion.name}</div>
          </div>
        </Card>
      )}

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-6 flex w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>


        <TabsContent value="bracket" className="mt-0">
          {matches.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-display font-semibold mb-1">Bracket not generated yet</h3>
              <p className="text-sm text-muted-foreground">Check back when the tournament begins.</p>
            </Card>
          ) : (
            <div
              className={cn(
                "grid gap-6 lg:gap-8 items-start",
                hasGroups && "lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]",
              )}
            >
              {hasGroups && (
                <section className="min-w-0">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-5 w-1 rounded-full bg-primary" />
                    <h2 className="text-lg font-display font-bold">Group Stage</h2>
                  </div>
                  <GroupStagePanel eventId={event.id} matches={groupMatches} sport={event.sport} />
                </section>
              )}
              <section className="min-w-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-5 w-1 rounded-full bg-primary" />
                  <h2 className="text-lg font-display font-bold">Knockout Stage</h2>
                </div>
                {knockoutMatches.length === 0 ? (
                  <Card className="p-10 text-center rounded-xl">
                    <Trophy className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="font-display font-semibold mb-1">
                      Knockout bracket not set yet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {hasGroups
                        ? "The bracket populates automatically once group qualifiers are decided."
                        : "Check back when the tournament begins."}
                    </p>
                  </Card>
                ) : (
                  <BracketView
                    matches={knockoutMatches}
                    onDetailsClick={(m) => setOpenMatch(m)}
                  />
                )}
              </section>
            </div>
          )}
        </TabsContent>


        <TabsContent value="predictions" className="mt-0">
          {predictableMatches.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-display font-semibold mb-1">No matches to predict yet</h3>
              <p className="text-sm text-muted-foreground">Predictions open once fixtures are set.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {predictableMatches.map((m) => (
                <Card key={m.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {m.team_a?.name ?? "TBD"} vs {m.team_b?.name ?? "TBD"}
                    </p>
                    <Badge variant="outline" className="capitalize text-[10px] shrink-0">
                      {m.status}
                    </Badge>
                  </div>
                  <MatchPrediction
                    matchId={m.id}
                    teamAName={m.team_a?.name ?? "Team A"}
                    teamBName={m.team_b?.name ?? "Team B"}
                    predictionDeadline={m.prediction_deadline ?? null}
                    result={m.result ?? null}
                    status={m.status}
                  />
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-0">
          <EventLeaderboard eventId={event.id} matchIds={matchIds} />
        </TabsContent>



        <TabsContent value="standings" className="mt-0">
          <StandingsTable rows={standings} profile={sportProfile} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-0">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            }
          >
            <EventGallery eventId={event.id} isAdmin={isAdmin} />
          </Suspense>
        </TabsContent>
      </Tabs>

      <Dialog open={!!openMatch} onOpenChange={(o) => !o && setOpenMatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {openMatch?.team_a?.name ?? "TBD"} vs {openMatch?.team_b?.name ?? "TBD"}
            </DialogTitle>
          </DialogHeader>
          {openMatch && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="font-mono text-3xl font-bold">
                  {openMatch.score_a ?? "—"} <span className="text-muted-foreground">:</span>{" "}
                  {openMatch.score_b ?? "—"}
                </div>
                <Badge variant="outline" className="mt-2 text-xs capitalize">
                  {openMatch.status}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Your prediction</h4>
                <MatchPrediction
                  matchId={openMatch.id}
                  teamAName={openMatch.team_a?.name ?? "Team A"}
                  teamBName={openMatch.team_b?.name ?? "Team B"}
                  predictionDeadline={openMatch.prediction_deadline ?? null}
                  result={openMatch.result ?? null}
                  status={openMatch.status}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Reactions</h4>
                <MatchReactions matchId={openMatch.id} />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Commentary</h4>
                <MatchTimeline matchId={openMatch.id} isAdmin={isAdmin} sport={event.sport} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
