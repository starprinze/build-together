import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Trophy,
  ArrowRight,
  Radio,
  Sparkles,
  Zap,
  Shield,
  Medal,
  Target,
  Flame,
  Camera,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const PHOTO_BUCKET = "event-photos";

/** Build a small thumbnail URL via storage image transforms; fall back to original. */
function thumbUrl(path: string | null, fallback: string) {
  if (!path) return fallback;
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path, {
    transform: { width: 400, height: 400, resize: "cover" },
  });
  return data.publicUrl ?? fallback;
}

interface Event {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "ongoing" | "completed";
}

interface MatchRow {
  id: string;
  event_id: string;
  match_number: number;
  round: number;
  status: "pending" | "live" | "completed" | "cancelled" | "bye";
  score_a: number | null;
  score_b: number | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
}

interface LeaderRow {
  user_id: string;
  username: string | null;
  total_points: number;
}

const eventStatusBadge: Record<Event["status"], string> = {
  upcoming: "bg-accent text-accent-foreground border-transparent",
  ongoing: "bg-success/15 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-transparent",
};

export default function Index() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchRow[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchRow[]>([]);
  const [recentResults, setRecentResults] = useState<MatchRow[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const matchSelect =
        "id,event_id,match_number,round,status,score_a,score_b,team_a:team_a_id(name),team_b:team_b_id(name)";

      const [evRes, liveRes, upRes, doneRes, lbRes] = await Promise.all([
        supabase
          .from("events")
          .select("id,name,sport,start_date,end_date,status")
          .order("start_date", { ascending: false }),
        supabase
          .from("matches")
          .select(matchSelect)
          .eq("status", "live")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("matches")
          .select(matchSelect)
          .eq("status", "pending")
          .not("team_a_id", "is", null)
          .not("team_b_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("matches")
          .select(matchSelect)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("leaderboard" as never)
          .select("user_id,username,total_points")
          .order("total_points", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;
      setEvents((evRes.data as Event[]) ?? []);
      setLiveMatches(((liveRes.data as unknown) as MatchRow[]) ?? []);
      setUpcomingMatches(((upRes.data as unknown) as MatchRow[]) ?? []);
      setRecentResults(((doneRes.data as unknown) as MatchRow[]) ?? []);
      setTopPlayers((lbRes.data as unknown as LeaderRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime: only subscribe while there are (or might be) live matches.
  useEffect(() => {
    const channel = supabase
      .channel("home-live-matches")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const m = payload.new as MatchRow;
          setLiveMatches((curr) => {
            const idx = curr.findIndex((x) => x.id === m.id);
            if (m.status === "live") {
              if (idx >= 0) {
                const copy = [...curr];
                copy[idx] = { ...copy[idx], ...m };
                return copy;
              }
              // newly live — refresh light list (insert head)
              return curr;
            }
            // not live anymore — drop
            return idx >= 0 ? curr.filter((x) => x.id !== m.id) : curr;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const featured = useMemo(
    () => events.find((e) => e.status === "ongoing") ?? events[0],
    [events],
  );

  const showLive = liveMatches.length > 0;
  const sectionMatches = showLive ? liveMatches : upcomingMatches;
  const totalLive = liveMatches.length;

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-hero-bg">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 80% 60%, hsl(var(--primary-glow,var(--primary))) 0, transparent 45%)",
          }}
        />
        <div className="container py-10 sm:py-16 lg:py-20 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-fade-in">
              {totalLive > 0 ? (
                <Badge className="mb-4 bg-destructive/15 text-destructive border border-destructive/30 uppercase tracking-wider text-[10px] font-bold inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  {totalLive} live now
                </Badge>
              ) : featured?.status === "ongoing" ? (
                <Badge className="mb-4 bg-success/15 text-success border border-success/30 uppercase tracking-wider text-[10px] font-bold">
                  Tournament ongoing
                </Badge>
              ) : null}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-4">
                {featured?.name ?? "Where campus champions"}
                <br />
                <span className="text-gradient-court">
                  {featured ? `${featured.sport} Tournament` : "are made."}
                </span>
              </h1>
              {featured && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <Calendar className="h-4 w-4" />
                  {new Date(featured.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {" – "}
                  {new Date(featured.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8">
                Live brackets, real-time scores, and gamified predictions. Follow your team, predict winners, climb the leaderboard.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {featured ? (
                  <Button asChild size="lg" className="shadow-court">
                    <Link to={`/events/${featured.id}`}>
                      View event <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="shadow-court">
                    <a href="#events">
                      Browse events <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline">
                  <Link to="/predictions">
                    <Target className="mr-1 h-4 w-4" /> Predict & earn
                  </Link>
                </Button>
              </div>
            </div>

            {/* Decorative hero panel */}
            <div className="relative hidden lg:block">
              <div className="aspect-[4/3] rounded-3xl bg-gradient-court shadow-glow relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 30%, white, transparent 50%), radial-gradient(circle at 80% 70%, white, transparent 40%)",
                  }}
                />
                <div className="absolute inset-0 grid place-items-center">
                  <Trophy className="h-40 w-40 text-primary-foreground/90 drop-shadow-2xl" />
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-primary-foreground">
                  <div>
                    <div className="text-xs uppercase tracking-wider opacity-80">
                      {totalLive > 0 ? "Live now" : "Up next"}
                    </div>
                    <div className="font-display font-bold text-2xl">
                      {totalLive > 0 ? `${totalLive} match${totalLive === 1 ? "" : "es"}` : `${upcomingMatches.length} fixtures`}
                    </div>
                  </div>
                  <Sparkles className="h-8 w-8 opacity-80" />
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-2xl bg-primary-glow/30 blur-2xl" />
              <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* PREDICTION CTA BANNER */}
      {!user && (
        <section className="container pt-8">
          <Card className="p-5 sm:p-6 bg-gradient-court text-primary-foreground shadow-court flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden relative">
            <div className="relative z-10">
              <div className="text-xs uppercase tracking-wider opacity-80">Predict & climb</div>
              <h3 className="font-display font-bold text-lg sm:text-xl">
                Predict today's matches and earn 10 pts per correct call.
              </h3>
            </div>
            <Button asChild variant="secondary" size="sm" className="relative z-10 whitespace-nowrap">
              <Link to="/login?mode=signup&redirect=%2Fpredictions">
                Create account <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Flame className="absolute -right-4 -top-4 h-32 w-32 opacity-15" />
          </Card>
        </section>
      )}

      {/* LIVE / UPCOMING MATCHES */}
      <section className="container py-10 sm:py-14">
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
              {showLive ? (
                <>
                  <span className="relative inline-flex h-2.5 w-2.5">
                    <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                  </span>
                  Live Matches
                </>
              ) : (
                <>
                  <Radio className="h-5 w-5 text-primary" /> Upcoming Matches
                </>
              )}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {showLive
                ? "Scores update in real time as the games unfold."
                : "Get your predictions in before kickoff."}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/matches">
              All matches <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : sectionMatches.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            No live or scheduled matches right now. Check back soon.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectionMatches.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* TOP PREDICTORS + RECENT RESULTS */}
      {(topPlayers.length > 0 || recentResults.length > 0) && (
        <section className="container pb-10 sm:pb-14 grid gap-6 lg:grid-cols-5">
          {/* Top Predictors */}
          <Card className="p-5 lg:col-span-2 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Medal className="h-4 w-4 text-primary" /> Top Predictors
              </h3>
              <Link to="/leaderboard" className="text-xs text-primary hover:underline">
                See all
              </Link>
            </div>
            {topPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No predictions scored yet.</p>
            ) : (
              <ol className="space-y-2">
                {topPlayers.map((p, i) => (
                  <li
                    key={p.user_id}
                    className="flex items-center justify-between gap-3 rounded-md py-2 px-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "h-7 w-7 grid place-items-center rounded-full text-xs font-bold tabular-nums",
                          i === 0 && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                          i === 1 && "bg-zinc-400/20 text-zinc-600 dark:text-zinc-300",
                          i === 2 && "bg-amber-700/20 text-amber-700 dark:text-amber-500",
                          i > 2 && "bg-muted text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium truncate">{p.username ?? "Player"}</span>
                    </div>
                    <span className="font-display font-bold tabular-nums">{p.total_points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Recent Results */}
          <Card className="p-5 lg:col-span-3 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Recent Results
              </h3>
              <Link to="/matches" className="text-xs text-primary hover:underline">
                All matches
              </Link>
            </div>
            {recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed matches yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentResults.map((m) => (
                  <li key={m.id} className="py-2.5">
                    <Link
                      to={`/events/${m.event_id}`}
                      className="flex items-center justify-between gap-3 hover:bg-muted/40 rounded-md px-2 -mx-2 py-1 transition-colors"
                    >
                      <div className="flex-1 min-w-0 text-sm">
                        <span className={cn("truncate", m.score_a! > m.score_b! ? "font-semibold" : "")}>
                          {m.team_a?.name ?? "TBD"}
                        </span>
                        <span className="text-muted-foreground"> · </span>
                        <span className={cn("truncate", m.score_b! > m.score_a! ? "font-semibold" : "")}>
                          {m.team_b?.name ?? "TBD"}
                        </span>
                      </div>
                      <div className="font-display font-bold text-sm tabular-nums whitespace-nowrap">
                        {m.score_a ?? 0}
                        <span className="text-muted-foreground mx-1">–</span>
                        {m.score_b ?? 0}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      {/* TOURNAMENTS GRID */}
      <section id="events" className="container pb-12 sm:pb-16">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">All Tournaments</h2>
            <p className="text-muted-foreground mt-1 text-sm">Tap an event to see its live bracket.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-display font-semibold text-lg mb-1">No tournaments yet</h3>
            <p className="text-muted-foreground text-sm">An admin will publish events here soon.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((e) => (
              <Link key={e.id} to={`/events/${e.id}`} className="group">
                <Card className="p-6 h-full transition-all hover:shadow-elevated hover:-translate-y-0.5 shadow-card relative overflow-hidden">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-court opacity-10 group-hover:opacity-20 transition-opacity"
                  />
                  <div className="flex items-start justify-between mb-4 relative">
                    <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-court text-primary-foreground shadow-court">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                        eventStatusBadge[e.status],
                      )}
                    >
                      {e.status}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {e.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{e.sport}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(e.start_date).toLocaleDateString()} →{" "}
                    {new Date(e.end_date).toLocaleDateString()}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FEATURE STRIP */}
      <section className="border-t border-border bg-muted/30">
        <div className="container py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Feature icon={Radio} title="Real-time updates" body="Live scores, brackets & match events" />
          <Feature icon={Trophy} title="Gamified predictions" body="Earn points & climb the ranks" />
          <Feature icon={Shield} title="Secure & scalable" body="Built on Lovable Cloud with RLS" />
          <Feature icon={Zap} title="Modern & fast" body="React, Vite & Tailwind CSS" />
        </div>
      </section>
    </div>
  );
}

const LiveMatchCard = memo(function LiveMatchCard({ match }: { match: MatchRow }) {
  const isLive = match.status === "live";
  const a = match.score_a ?? 0;
  const b = match.score_b ?? 0;
  return (
    <Link to={`/events/${match.event_id}`} className="group">
      <Card
        className={cn(
          "p-5 h-full transition-all hover:-translate-y-0.5 shadow-card hover:shadow-elevated relative overflow-hidden",
          isLive && "ring-1 ring-destructive/40",
        )}
      >
        {isLive && (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-destructive to-transparent animate-pulse"
          />
        )}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Round {match.round} · #{match.match_number}
          </span>
          {isLive ? (
            <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-[10px] uppercase font-bold inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] uppercase">
              Upcoming
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide name={match.team_a?.name ?? "TBD"} />
          {isLive ? (
            <div className="font-display font-extrabold text-3xl tabular-nums whitespace-nowrap text-foreground">
              {a}
              <span className="text-muted-foreground mx-1.5">–</span>
              {b}
            </div>
          ) : (
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">vs</div>
          )}
          <TeamSide name={match.team_b?.name ?? "TBD"} align="right" />
        </div>
      </Card>
    </Link>
  );
});

function TeamSide({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <div className={cn("text-sm font-semibold truncate", align === "right" ? "text-right" : "text-left")} title={name}>
        {name}
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Radio;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-court text-primary-foreground shadow-court shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{body}</div>
      </div>
    </div>
  );
}
