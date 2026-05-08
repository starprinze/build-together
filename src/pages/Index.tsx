import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Trophy, ArrowRight, Radio, Sparkles, Zap, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "ongoing" | "completed";
}

interface LiveMatch {
  id: string;
  event_id: string;
  match_number: number;
  round: number;
  status: string;
  score_a: number | null;
  score_b: number | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
}

const statusBadge: Record<Event["status"], string> = {
  upcoming: "bg-accent text-accent-foreground border-transparent",
  ongoing: "bg-success/15 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-transparent",
};

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: ev }, { data: mt }] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .order("start_date", { ascending: false }),
        supabase
          .from("matches")
          .select(
            "id,event_id,match_number,round,status,score_a,score_b,team_a:team_a_id(name),team_b:team_b_id(name)",
          )
          .in("status", ["live", "pending"])
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (cancelled) return;
      setEvents((ev as Event[]) ?? []);
      setMatches((mt as unknown as LiveMatch[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(
    () => events.find((e) => e.status === "ongoing") ?? events[0],
    [events],
  );

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-hero-bg">
        <div className="container py-12 sm:py-20 lg:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-fade-in">
              {featured?.status === "ongoing" && (
                <Badge className="mb-5 bg-destructive/15 text-destructive border border-destructive/30 uppercase tracking-wider text-[10px] font-bold inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  Ongoing
                </Badge>
              )}
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
                  {new Date(featured.start_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  {" – "}
                  {new Date(featured.end_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8">
                Live brackets, real-time scores, and gamified predictions.
                Follow your team, predict winners, climb the leaderboard.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {featured ? (
                  <Button asChild size="lg" className="shadow-court">
                    <Link to={`/events/${featured.id}`}>
                      View Event <ArrowRight className="ml-1 h-4 w-4" />
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
                  <Link to="/leaderboard">
                    <Trophy className="mr-1 h-4 w-4" /> Leaderboard
                  </Link>
                </Button>
              </div>
            </div>

            {/* Decorative hero panel */}
            <div className="relative hidden lg:block">
              <div className="aspect-[4/3] rounded-3xl bg-gradient-court shadow-glow relative overflow-hidden">
                <div className="absolute inset-0 opacity-30 mix-blend-overlay"
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
                    <div className="text-xs uppercase tracking-wider opacity-80">Live now</div>
                    <div className="font-display font-bold text-2xl">
                      {matches.length} matches
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

      {/* LIVE MATCHES */}
      <section className="container py-12 sm:py-16">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
              <Radio className="h-5 w-5 text-destructive animate-pulse" /> Live Matches
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Currently being played and up next.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <a href="#events">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            No live or upcoming matches right now. Check back soon.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((m) => {
              const isLive = m.status === "live";
              return (
                <Link key={m.id} to={`/events/${m.event_id}`} className="group">
                  <Card
                    className={cn(
                      "p-5 h-full transition-all hover:-translate-y-0.5 shadow-card hover:shadow-elevated relative overflow-hidden",
                      isLive && "ring-1 ring-primary/30",
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Round {m.round} · #{m.match_number}
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
                    <div className="flex items-center justify-between gap-3">
                      <TeamSide name={m.team_a?.name ?? "TBD"} />
                      {isLive ? (
                        <div className="font-display font-bold text-2xl tabular-nums whitespace-nowrap">
                          {m.score_a ?? 0}
                          <span className="text-muted-foreground mx-1">-</span>
                          {m.score_b ?? 0}
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-muted-foreground">vs</div>
                      )}
                      <TeamSide name={m.team_b?.name ?? "TBD"} align="right" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* TOURNAMENTS GRID */}
      <section id="events" className="container pb-12 sm:pb-16">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">All Tournaments</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Tap an event to see its live bracket.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-20">Loading events…</div>
        ) : events.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-display font-semibold text-lg mb-1">No tournaments yet</h3>
            <p className="text-muted-foreground text-sm">
              An admin will publish events here soon.
            </p>
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
                        statusBadge[e.status],
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
          <Feature icon={Radio} title="Real-time Updates" body="Live scores, brackets & match events" />
          <Feature icon={Trophy} title="Gamified Predictions" body="Earn points & climb the ranks" />
          <Feature icon={Shield} title="Secure & Scalable" body="Built on Lovable Cloud with RLS" />
          <Feature icon={Zap} title="Modern & Fast" body="React, Vite & Tailwind CSS" />
        </div>
      </section>
    </div>
  );
}

function TeamSide({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  return (
    <div className={cn("flex-1 min-w-0", align === "right" && "text-right")}>
      <div className="grid grid-cols-1">
        <div
          className={cn(
            "text-sm font-semibold truncate",
            align === "right" ? "justify-self-end" : "justify-self-start",
          )}
          title={name}
        >
          {name}
        </div>
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
