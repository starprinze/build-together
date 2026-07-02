import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, RotateCcw, FileDown, FileText, Wand2, Clock } from "lucide-react";
import {
  generateFixtures,
  resetFixtures,
  submitScore,
  startMatch,
  finishMatch,
  reopenMatch,
  cancelMatch,
  type FixtureFormat,
} from "@/lib/bracket";
import { BracketView, MatchRow } from "@/components/BracketView";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { computeStandings } from "@/lib/standings";
import { StandingsTable } from "@/components/StandingsTable";

interface Event { id: string; name: string; format: FixtureFormat; sport?: string }

export default function AdminFixtures() {
  const { isSuperAdmin, managedOrgId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [scoringMatch, setScoringMatch] = useState<MatchRow | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [summaryView, setSummaryView] = useState<MatchRow | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);

  useEffect(() => {
    let query = supabase
      .from("events")
      .select("id,name,format,sport")
      .order("created_at", { ascending: false });
    if (!isSuperAdmin && managedOrgId) query = query.eq("organization_id", managedOrgId);
    query.then(({ data }) => {
      setEvents((data as Event[]) ?? []);
      if (data && data.length && !eventId) setEventId(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, managedOrgId]);

  const currentEvent = events.find((e) => e.id === eventId);

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
    if (!eventId || !currentEvent) return;
    if (matches.length && !confirm("This wipes existing fixtures. Continue?")) return;
    setBusy(true);
    try {
      const { data: teams } = await supabase.from("teams").select("id").eq("event_id", eventId);
      if (!teams || teams.length < 2) throw new Error("Register at least 2 teams first");
      await generateFixtures(eventId, teams.map((t) => t.id), currentEvent.format ?? "single_elim");
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
      toast.success("Score saved · match marked Live");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStart = async () => {
    if (!scoringMatch) return;
    try {
      await startMatch(scoringMatch.id);
      toast.success("Match started");
      setScoringMatch(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleFinish = async () => {
    if (!scoringMatch) return;
    if (!confirm("Finish this match? Predictions will finalise and points awarded.")) return;
    try {
      const a = scoreA === "" ? undefined : parseInt(scoreA);
      const b = scoreB === "" ? undefined : parseInt(scoreB);
      await finishMatch(scoringMatch.id, a, b);
      toast.success("Match finished · points awarded");
      setScoringMatch(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReopen = async () => {
    if (!scoringMatch) return;
    if (!confirm("Reopen this match for editing?")) return;
    try {
      await reopenMatch(scoringMatch.id);
      toast.success("Match reopened");
      setScoringMatch(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCancel = async () => {
    if (!scoringMatch) return;
    if (!confirm("Cancel this match?")) return;
    try {
      await cancelMatch(scoringMatch.id);
      toast.success("Match cancelled");
      setScoringMatch(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleExport = async (kind: "pdf" | "excel" | "csv" | "docx") => {
    if (!eventId) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-event", {
        body: { eventId, format: kind },
      });
      if (error) throw error;
      const { filename, mime, data: b64 } = data as { filename: string; mime: string; data: string };
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch (err: any) {
      toast.error(err.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const generateSummary = async (m: MatchRow) => {
    setAiBusy(m.id);
    try {
      const { data, error } = await supabase.functions.invoke("match-summary", {
        body: { matchId: m.id },
      });
      if (error) throw error;
      toast.success("Summary generated");
      setSummaryView({ ...m, summary: (data as any)?.summary } as any);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Summary failed");
    } finally {
      setAiBusy(null);
    }
  };

  const sportProfile = getSportProfile(currentEvent?.sport);
  const standings = computeStandings(matches, sportProfile);
  const showStandings =
    currentEvent?.format === "round_robin" || currentEvent?.format === "league";

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
          <>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button variant="outline" onClick={() => handleExport("pdf")} disabled={exporting}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport("excel")} disabled={exporting}>
              <FileDown className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport("csv")} disabled={exporting}>
              <FileDown className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport("docx")} disabled={exporting}>
              <FileText className="h-4 w-4 mr-1" /> DOCX
            </Button>
          </>
        )}
      </div>

      {matches.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No fixtures yet. Click "Generate fixtures" to build the {currentEvent?.format ?? "bracket"}.
        </Card>
      ) : (
        <>
          {showStandings && (
            <Card className="p-4 mb-6 shadow-card">
              <h2 className="text-lg font-display font-semibold mb-3">Standings</h2>
              <StandingsTable rows={standings} />
            </Card>
          )}
          <BracketView matches={matches} onScoreClick={openScore} />

          {/* Prediction deadlines for upcoming matches */}
          {matches.some((m) => m.status === "pending" && m.team_a_id && m.team_b_id) && (
            <Card className="p-4 mt-6 shadow-card">
              <h2 className="text-lg font-display font-semibold mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Prediction deadlines
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Set when predictions close for each upcoming match. Leave empty to allow predictions until the score is recorded.
              </p>
              <div className="space-y-2">
                {matches
                  .filter((m) => m.status === "pending" && m.team_a_id && m.team_b_id)
                  .map((m) => (
                    <DeadlineRow key={m.id} match={m} onSaved={load} />
                  ))}
              </div>
            </Card>
          )}

          {/* Per-match AI summary list for completed matches */}
          {matches.some((m) => m.status === "completed") && (
            <Card className="p-4 mt-6 shadow-card">
              <h2 className="text-lg font-display font-semibold mb-3">AI match recaps</h2>
              <div className="space-y-2">
                {matches.filter((m) => m.status === "completed").map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="truncate">
                        {m.team_a?.name} <span className="font-mono text-muted-foreground">{m.score_a}</span>
                        {" – "}
                        <span className="font-mono text-muted-foreground">{m.score_b}</span> {m.team_b?.name}
                      </div>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => {
                          setSummaryView(m);
                          setSummaryDraft((m as any).summary ?? "");
                        }}
                      >
                        {(m as any).summary ? "View / edit recap" : "Write recap"}
                      </button>

                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateSummary(m)}
                      disabled={aiBusy === m.id}
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1" />
                      {aiBusy === m.id ? "Writing…" : (m as any).summary ? "Regenerate" : "Generate recap"}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!scoringMatch} onOpenChange={(o) => !o && setScoringMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Match control · <span className="capitalize">{scoringMatch?.status}</span>
            </DialogTitle>
            {scoringMatch && (
              <DialogDescription>
                {scoringMatch.team_a?.name} vs {scoringMatch.team_b?.name}
              </DialogDescription>
            )}
          </DialogHeader>
          {scoringMatch && (
            <form onSubmit={saveScore} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{scoringMatch.team_a?.name}</Label>
                  <Input type="number" min={0} value={scoreA} onChange={(e) => setScoreA(e.target.value)} />
                </div>
                <div>
                  <Label>{scoringMatch.team_b?.name}</Label>
                  <Input type="number" min={0} value={scoreB} onChange={(e) => setScoreB(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Saving the score keeps the match <strong>Live</strong>. Click <strong>Finish match</strong> only when full-time — that's when predictions finalise and points are awarded.
              </p>
              <DialogFooter className="flex-wrap gap-2 sm:gap-2">
                {scoringMatch.status === "pending" && (
                  <Button type="button" variant="outline" onClick={handleStart}>
                    Start match
                  </Button>
                )}
                {scoringMatch.status !== "completed" && scoringMatch.status !== "cancelled" && (
                  <>
                    <Button type="submit" variant="secondary">
                      Save score
                    </Button>
                    <Button type="button" onClick={handleFinish} className="shadow-court">
                      Finish match
                    </Button>
                  </>
                )}
                {scoringMatch.status === "completed" && (
                  <Button type="button" variant="outline" onClick={handleReopen}>
                    Reopen
                  </Button>
                )}
                {scoringMatch.status !== "cancelled" && scoringMatch.status !== "completed" && (
                  <Button type="button" variant="ghost" className="text-destructive" onClick={handleCancel}>
                    Cancel match
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!summaryView} onOpenChange={(o) => !o && setSummaryView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match recap</DialogTitle>
            {summaryView && (
              <DialogDescription>
                {summaryView.team_a?.name} {summaryView.score_a} – {summaryView.score_b} {summaryView.team_b?.name}
              </DialogDescription>
            )}
          </DialogHeader>
          <Textarea
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            placeholder="Write a recap of the match — key plays, MVP, turning points…"
            rows={8}
          />
          <DialogFooter className="gap-2">
            {summaryView && (summaryView as any).summary && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!summaryView) return;
                  if (!confirm("Clear the saved recap?")) return;
                  setSavingSummary(true);
                  const { error } = await supabase
                    .from("matches")
                    .update({ summary: null })
                    .eq("id", summaryView.id);
                  setSavingSummary(false);
                  if (error) return toast.error(error.message);
                  toast.success("Recap cleared");
                  setSummaryView(null);
                  setSummaryDraft("");
                  load();
                }}
              >
                Clear
              </Button>
            )}
            <Button
              disabled={savingSummary}
              onClick={async () => {
                if (!summaryView) return;
                setSavingSummary(true);
                const { error } = await supabase
                  .from("matches")
                  .update({ summary: summaryDraft.trim() || null })
                  .eq("id", summaryView.id);
                setSavingSummary(false);
                if (error) return toast.error(error.message);
                toast.success("Recap saved");
                setSummaryView(null);
                load();
              }}
              className="shadow-court"
            >
              {savingSummary ? "Saving…" : "Save recap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function DeadlineRow({ match, onSaved }: { match: MatchRow; onSaved: () => void }) {
  const [value, setValue] = useState<string>(toLocalInput((match as any).prediction_deadline));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const iso = value ? new Date(value).toISOString() : null;
    const { error } = await supabase
      .from("matches")
      .update({ prediction_deadline: iso })
      .eq("id", match.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Deadline saved");
      onSaved();
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap py-2 border-b border-border last:border-0">
      <div className="text-sm flex-1 min-w-[180px] truncate">
        {match.team_a?.name} <span className="text-muted-foreground">vs</span> {match.team_b?.name}
      </div>
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-auto text-sm"
      />
      <Button size="sm" variant="outline" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
