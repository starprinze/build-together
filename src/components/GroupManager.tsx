import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Layers, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  listGroups,
  createGroup,
  deleteGroup,
  updateGroup,
  generateGroupStage,
  groupStandings,
  type GroupRow,
} from "@/lib/groups";
import type { MatchRow } from "@/components/BracketView";
import { StandingsTable } from "@/components/StandingsTable";
import type { SportProfile } from "@/lib/sports";

interface TeamOpt { id: string; name: string }

/**
 * Phase 3 — visual group manager. Create groups, drop teams into them, and
 * generate a round-robin schedule per group. Sport-agnostic: standings and
 * qualification read from the active SportProfile.
 */
export function GroupManager({
  eventId,
  teams,
  matches,
  profile,
  onChanged,
}: {
  eventId: string;
  teams: TeamOpt[];
  matches: MatchRow[];
  profile: SportProfile;
  onChanged: () => void;
}) {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  // teamId -> groupId (or "" for unassigned)
  const [assign, setAssign] = useState<Record<string, string>>({});

  const groupMatches = useMemo(
    () => matches.filter((m) => (m as any).group_id),
    [matches],
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const g = await listGroups(eventId);
      setGroups(g);
      // Seed assignments from existing group matches.
      const seed: Record<string, string> = {};
      groupMatches.forEach((m) => {
        const gid = (m as any).group_id as string;
        if (m.team_a_id) seed[m.team_a_id] = gid;
        if (m.team_b_id) seed[m.team_b_id] = gid;
      });
      setAssign((prev) => ({ ...seed, ...prev }));
    } catch (e: any) {
      toast.error(e.message ?? "Could not load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, matches]);

  const addGroup = async () => {
    const name = newName.trim() || `Group ${String.fromCharCode(65 + groups.length)}`;
    setBusy(true);
    try {
      await createGroup(eventId, name);
      setNewName("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeGroup = async (id: string) => {
    if (!confirm("Delete this group? Its fixtures stay but lose the group tag.")) return;
    try {
      await deleteGroup(id);
      await refresh();
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const setQualify = async (id: string, qualify_count: number) => {
    try {
      await updateGroup(id, { qualify_count });
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, qualify_count } : g)));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const generate = async () => {
    const assignments: Record<string, string[]> = {};
    groups.forEach((g) => (assignments[g.id] = []));
    Object.entries(assign).forEach(([teamId, gid]) => {
      if (gid && assignments[gid]) assignments[gid].push(teamId);
    });
    const total = Object.values(assignments).reduce((n, a) => n + a.length, 0);
    if (total < 2) return toast.error("Assign at least two teams to groups first");
    if (matches.some((m) => (m as any).group_id) &&
      !confirm("Regenerate group fixtures? Unlocked group matches are replaced.")) return;
    setBusy(true);
    try {
      await generateGroupStage(eventId, assignments);
      toast.success("Group fixtures generated");
      onChanged();
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  

  return (
    <Card className="p-4 mb-6 shadow-card">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" /> Group stage
          </h2>
          <p className="text-xs text-muted-foreground">
            Create groups, assign teams, then generate a round-robin per group.
          </p>
        </div>
        <Button size="sm" onClick={generate} disabled={busy || groups.length === 0} className="shadow-court">
          <Sparkles className="h-4 w-4 mr-1" /> Generate group fixtures
        </Button>
      </div>

      <div className="flex items-end gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <Label htmlFor="grp-name">New group</Label>
          <Input
            id="grp-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Group ${String.fromCharCode(65 + groups.length)}`}
            className="h-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={addGroup} disabled={busy}>
          <Plus className="h-4 w-4 mr-1" /> Add group
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading groups…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No groups yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => {
            const teamsInGroup = teams.filter((t) => assign[t.id] === g.id);
            const gMatches = groupMatches.filter((m) => (m as any).group_id === g.id);
            const standings = groupStandings(gMatches, profile);
            return (
              <div key={g.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-sm">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{teamsInGroup.length} teams</Badge>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">Qualify</span>
                      <Input
                        type="number"
                        min={0}
                        value={g.qualify_count}
                        onChange={(e) => setQualify(g.id, Math.max(0, Number(e.target.value)))}
                        className="h-7 w-14 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => removeGroup(g.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {standings.length > 0 && (
                  <StandingsTable rows={standings} profile={profile} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {groups.length > 0 && teams.length > 0 && (
        <div className="mt-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Team assignment</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="text-sm flex-1 truncate">{t.name}</span>
                <Select
                  value={assign[t.id] || "unassigned"}
                  onValueChange={(v) => setAssign((p) => ({ ...p, [t.id]: v === "unassigned" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">— Unassigned —</SelectItem>
                    {groups.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

          </div>
        </div>
      )}
    </Card>
  );
}
