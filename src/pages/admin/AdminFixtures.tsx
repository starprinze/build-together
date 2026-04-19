import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, RotateCcw } from "lucide-react";
import { generateFixtures, resetFixtures, submitScore } from "@/lib/bracket";
import { BracketView, MatchRow } from "@/components/BracketView";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Event { id: string; name: string }

export default function AdminFixtures() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [scoringMatch, setScoringMatch] = useState<MatchRow | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("events").select("id,name").order("created_at", { ascending: false }).then(({ data }) => {
      setEvents((data as Event[]) ?? []);
      if (data && data.length && !eventId) setEventId(data[0].id);
    });
  }, []);

  const load = async () => {
    if (!eventId) return setMatches([]);
    const { data } = await supabase
      .from("matches")
      .select("*, team_a:team_a_id(id,name,department), team_b:team_b_id(id,name,department), winner:winner_id(id,name)")
      .eq("event_id", eventId)
      .order("round")
      .order("match_number");
    setMatches((data as any) ?? []);
  };

  useEffect(() => { load(); }, [eventId]);

  const handleGenerate = async () => {
    if (!eventId) return;
    if (matches.length && !confirm("This wipes existing fixtures. Continue?")) return;
    setBusy(true);
    try {
      const { data: teams } = await supabase.from("teams").select("id").eq("event_id", eventId);
      if (!teams || teams.length < 2) throw new Error("Register at least 2 teams first");
      await generateFixtures(eventId, teams.map((t) => t.id));
      toast.success("Fixtures generated");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!eventId || !confirm("Clear all fixtures for this event?")) return;
    try {
      await resetFixtures(eventId);
      toast.success("Cleared");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openScore = (m: MatchRow) => {
    setScoringMatch(m);
    setScoreA(m.score_a?.toString() ?? "");
    setScoreB(m.score_b?.toString() ?? "");
  };

  const saveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoringMatch) return;
    try {
      await submitScore(scoringMatch.id, parseInt(scoreA), parseInt(scoreB));
      toast.success("Score saved");
      setScoringMatch(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">Fixtures & Scores</h1>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="min-w-[220px]">
          <Label>Event</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
            <SelectContent>
              {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={busy || !eventId} className="shadow-court">
          <Sparkles className="h-4 w-4 mr-1" /> Generate fixtures
        </Button>
        {matches.length > 0 && (
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
        )}
      </div>

      {matches.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No fixtures yet. Click "Generate fixtures" to build the bracket.
        </Card>
      ) : (
        <BracketView matches={matches} onScoreClick={openScore} />
      )}

      <Dialog open={!!scoringMatch} onOpenChange={(o) => !o && setScoringMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter score</DialogTitle>
          </DialogHeader>
          {scoringMatch && (
            <form onSubmit={saveScore} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{scoringMatch.team_a?.name}</Label>
                  <Input
                    type="number"
                    min={0}
                    required
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{scoringMatch.team_b?.name}</Label>
                  <Input
                    type="number"
                    min={0}
                    required
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="shadow-court">Save score</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
