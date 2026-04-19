import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BracketView, MatchRow, EventInfo } from "@/components/BracketView";

export default function EventBracket() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: ev }, { data: mts }, { count }] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("matches")
          .select("*, team_a:team_a_id(id,name,department), team_b:team_b_id(id,name,department), winner:winner_id(id,name)")
          .eq("event_id", id)
          .order("round")
          .order("match_number"),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("event_id", id),
      ]);
      setEvent(ev as EventInfo | null);
      setMatches((mts as any) ?? []);
      setTeamCount(count ?? 0);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading bracket…</div>;
  if (!event) return <div className="container py-20 text-center">Event not found.</div>;

  const totalRounds = matches.length ? Math.max(...matches.map((m) => m.round)) : 0;
  const finalMatch = matches.find((m) => m.round === totalRounds);
  const champion = totalRounds > 0 && finalMatch?.status === "completed" ? finalMatch.winner : null;

  return (
    <div className="container py-8 sm:py-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <Badge className="mb-2 bg-accent text-accent-foreground border-0">{event.sport}</Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-bold">{event.name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4" /> {teamCount} teams · {event.status}
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

      {matches.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">Bracket not generated yet</h3>
          <p className="text-sm text-muted-foreground">Check back when the tournament begins.</p>
        </Card>
      ) : (
        <BracketView matches={matches} />
      )}
    </div>
  );
}
