import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchItem {
  id: string;
  event_id: string;
  round: number;
  match_number: number;
  status: "pending" | "live" | "completed" | "cancelled" | "bye";
  score_a: number | null;
  score_b: number | null;
  prediction_deadline: string | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
}

const statusMeta: Record<MatchItem["status"], { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  pending: { label: "Upcoming", cls: "bg-muted text-muted-foreground border-transparent" },
  completed: { label: "Finished", cls: "bg-primary/10 text-primary border-primary/30" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-transparent" },
  bye: { label: "Bye", cls: "bg-muted text-muted-foreground border-transparent" },
};

export default function Matches() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("matches")
      .select(
        "id,event_id,round,match_number,status,score_a,score_b,prediction_deadline,team_a:team_a_id(name),team_b:team_b_id(name)",
      )
      .in("status", ["live", "pending", "completed"])
      .order("created_at", { ascending: false })
      .limit(36)
      .then(({ data }) => {
        if (cancelled) return;
        setMatches(((data as unknown) as MatchItem[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("matches-page")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const m = payload.new as MatchItem;
          setMatches((curr) => curr.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "pending");
  const finished = matches.filter((m) => m.status === "completed");

  return (
    <div className="container py-8 sm:py-12">
      <div className="max-w-2xl mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Matches</h1>
        <p className="mt-2 text-muted-foreground">
          Follow live games, upcoming kickoffs, and recent results.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No matches available yet.</Card>
      ) : (
        <div className="space-y-10">
          <Section
            title="Live now"
            icon={<Radio className="h-4 w-4 text-destructive" />}
            items={live}
            empty="No live matches right now."
          />
          <Section title="Upcoming" items={upcoming} empty="Nothing scheduled yet." />
          <Section title="Recent results" items={finished} empty="No finished matches yet." />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon?: React.ReactNode;
  items: MatchItem[];
  empty: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
        {icon}
        {title}
        <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((match) => {
            const isLive = match.status === "live";
            const meta = statusMeta[match.status];
            return (
              <Link key={match.id} to={`/events/${match.event_id}`}>
                <Card
                  className={cn(
                    "p-5 h-full transition-all hover:-translate-y-0.5 hover:shadow-elevated",
                    isLive && "ring-1 ring-destructive/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Round {match.round} · #{match.match_number}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px] uppercase", meta.cls)}>
                      {isLive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse mr-1" />
                      )}
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <span className="font-medium truncate text-sm">{match.team_a?.name ?? "TBD"}</span>
                    {isLive || match.status === "completed" ? (
                      <span className="font-display font-extrabold text-2xl tabular-nums">
                        {match.score_a ?? 0}
                        <span className="text-muted-foreground mx-1">–</span>
                        {match.score_b ?? 0}
                      </span>
                    ) : (
                      <span className="text-xs font-bold uppercase text-muted-foreground">vs</span>
                    )}
                    <span className="font-medium truncate text-sm text-right">
                      {match.team_b?.name ?? "TBD"}
                    </span>
                  </div>
                  {match.status === "pending" && match.prediction_deadline && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Predictions close {new Date(match.prediction_deadline).toLocaleString()}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
