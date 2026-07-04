import { supabase } from "@/integrations/supabase/client";
import type { MatchRow } from "@/components/BracketView";
import { computeStandings, type StandingRow } from "@/lib/standings";
import { DEFAULT_SPORT_PROFILE, type SportProfile } from "@/lib/sports";

// ============================================================================
// Phase 3 — Group Stage engine
// Sport-agnostic, org-isolated (RLS via can_manage_event). Groups hold teams,
// generate a round-robin schedule, produce standings, and drive qualification.
// ============================================================================

export interface GroupRow {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  qualify_count: number;
}

export interface GroupWithTeams extends GroupRow {
  teamIds: string[];
}

/** Fetch all groups for an event, ordered for display. */
export async function listGroups(eventId: string): Promise<GroupRow[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("id,event_id,name,sort_order,qualify_count")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as GroupRow[]) ?? [];
}

/** Create a new group. Appends to the end by default. */
export async function createGroup(
  eventId: string,
  name: string,
  qualifyCount = 2,
): Promise<GroupRow> {
  const { data: last } = await supabase
    .from("groups")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (last?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("groups")
    .insert({ event_id: eventId, name: name.trim(), qualify_count: qualifyCount, sort_order })
    .select("id,event_id,name,sort_order,qualify_count")
    .single();
  if (error) throw error;
  return data as GroupRow;
}

export async function updateGroup(
  groupId: string,
  patch: Partial<Pick<GroupRow, "name" | "sort_order" | "qualify_count">>,
) {
  const { error } = await supabase.from("groups").update(patch).eq("id", groupId);
  if (error) throw error;
}

/** Delete a group. Matches keep existing (group_id set to null via FK). */
export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;
}

/** Assign / unassign a match to a group. */
export async function assignMatchToGroup(matchId: string, groupId: string | null) {
  const { error } = await supabase.from("matches").update({ group_id: groupId }).eq("id", matchId);
  if (error) throw error;
}

// ---------- Round-robin generation within a group ----------
function roundRobinPairs(teamIds: string[]): Array<[string, string]> {
  const teams = [...teamIds];
  if (teams.length % 2 === 1) teams.push("__BYE__");
  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const pairs: Array<[string, string]> = [];
  let local = [...teams];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = local[i];
      const b = local[n - 1 - i];
      if (a === "__BYE__" || b === "__BYE__") continue;
      pairs.push([a, b]);
    }
    local = [local[0], local[n - 1], ...local.slice(1, n - 1)];
  }
  return pairs;
}

/**
 * Generate a round-robin schedule for every group of an event.
 * Existing group matches are cleared first (locked ones are preserved).
 * `assignments` maps groupId -> team ids in that group.
 */
export async function generateGroupStage(
  eventId: string,
  assignments: Record<string, string[]>,
) {
  // Clear existing unlocked group-stage matches for this event.
  await supabase
    .from("matches")
    .delete()
    .eq("event_id", eventId)
    .eq("bracket", "group")
    .eq("locked", false);

  const rows: Array<Record<string, unknown>> = [];
  for (const [groupId, teamIds] of Object.entries(assignments)) {
    if (teamIds.length < 2) continue;
    const pairs = roundRobinPairs(teamIds);
    pairs.forEach(([a, b], idx) => {
      rows.push({
        event_id: eventId,
        group_id: groupId,
        round: 1,
        match_number: idx + 1,
        team_a_id: a,
        team_b_id: b,
        status: "pending",
        bracket: "group",
      });
    });
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from("matches").insert(rows);
  if (error) throw error;
}

/** Standings for a single group, driven by the sport profile. */
export function groupStandings(
  groupMatches: MatchRow[],
  profile: SportProfile = DEFAULT_SPORT_PROFILE,
): StandingRow[] {
  return computeStandings(groupMatches, profile);
}

/**
 * Determine which teams qualify from each group.
 * Returns team ids ranked by group then position, for seeding a knockout draw.
 */
export function qualifiedTeams(
  groups: GroupRow[],
  standingsByGroup: Record<string, StandingRow[]>,
): string[] {
  const out: string[] = [];
  for (const g of groups) {
    const rows = standingsByGroup[g.id] ?? [];
    out.push(...rows.slice(0, Math.max(0, g.qualify_count)).map((r) => r.teamId));
  }
  return out;
}
