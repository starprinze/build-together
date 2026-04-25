import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BracketView, MatchRow, EventInfo } from "@/components/BracketView";
import { StandingsTable } from "@/components/StandingsTable";
import { EventGallery } from "@/components/EventGallery";
import { MatchTimeline } from "@/components/MatchTimeline";
import { MatchReactions } from "@/components/MatchReactions";
import { computeStandings } from "@/lib/standings";
import { useAuth } from "@/hooks/useAuth";

export default function EventBracket() {
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
        supabase.from("events").select("*").eq("id", id).maybeSingle(),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("event_id", id),
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
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`matches-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `event_id=eq.${id}` },
        () => {
          loadMatches();
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMatches]);

  if (loading)
    return <div className="container py-20 text-center text-muted-foreground">Loading bracket…</div>;
  if (!event) return <div className="container py-20 text-center">Event not found.</div>;

  const totalRounds = matches.length ? Math.max(...matches.map((m) => m.round)) : 0;
  const finalMatch = matches.find((m) => m.round === totalRounds);
  const champion = totalRounds > 0 && finalMatch?.status === "completed" ? finalMatch.winner : null;
  const standings = computeStandings(matches);

  return (
    <div className="container py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <Badge className="mb-2 bg-accent text-accent-foreground border-0">{event.sport}</Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-bold">{event.name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {teamCount} teams · {event.status}
            </span>
            {live && (
              <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
                <Radio className="h-3 w-3 animate-pulse" /> Live
              </span>
            )}
          </p>
        </div>
        {champion && (
          <Card className="px-5 py-4 bg-gradient-court text-primary-foreground shadow-court flex items-center gap-3">
            <Trophy className="h-7 w-7" />
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80">Champion</div>
              <div className="font-display font-bold text-lg">{champion.name}</div>
            </div>
          </Card>
        )}
      </div>

      <Tabs defaultValue="bracket" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
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
            <BracketView matches={matches} onDetailsClick={(m) => setOpenMatch(m)} />
          )}
        </TabsContent>

        <TabsContent value="standings" className="mt-0">
          <StandingsTable rows={standings} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-0">
          <EventGallery eventId={event.id} isAdmin={isAdmin} />
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
                <h4 className="text-sm font-semibold mb-2">Reactions</h4>
                <MatchReactions matchId={openMatch.id} />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Commentary</h4>
                <MatchTimeline matchId={openMatch.id} isAdmin={isAdmin} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
