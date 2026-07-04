import { describe, it, expect } from "vitest";
import { groupStandings, qualifiedTeams, type GroupRow } from "@/lib/groups";
import type { MatchRow } from "@/components/BracketView";
import type { StandingRow } from "@/lib/standings";

const team = (id: string, name: string) => ({ id, name });

function m(partial: Partial<MatchRow>): MatchRow {
  return {
    id: Math.random().toString(36).slice(2),
    round: 1,
    match_number: 1,
    status: "completed",
    score_a: 0,
    score_b: 0,
    winner_id: null,
    team_a: null,
    team_b: null,
    bracket: "group",
    ...partial,
  } as MatchRow;
}

describe("groupStandings", () => {
  it("ranks teams within a group by points then diff", () => {
    const a = team("a", "Alpha");
    const b = team("b", "Bravo");
    const c = team("c", "Charlie");
    const matches: MatchRow[] = [
      m({ team_a: a, team_b: b, score_a: 3, score_b: 0, winner_id: "a" }),
      m({ team_a: a, team_b: c, score_a: 1, score_b: 0, winner_id: "a" }),
      m({ team_a: b, team_b: c, score_a: 2, score_b: 2, winner_id: null }),
    ];
    const rows = groupStandings(matches);
    expect(rows[0].teamId).toBe("a");
    expect(rows[0].points).toBe(6);
    // Bravo & Charlie each drew (1 pt); Charlie's better goal diff ranks it higher.
    expect(rows[1].teamId).toBe("c");
  });
});

describe("qualifiedTeams", () => {
  it("takes top-N per group in group order", () => {
    const groups: GroupRow[] = [
      { id: "g1", event_id: "e", name: "A", sort_order: 0, qualify_count: 2 },
      { id: "g2", event_id: "e", name: "B", sort_order: 1, qualify_count: 1 },
    ];
    const mk = (id: string): StandingRow => ({
      teamId: id,
      name: id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      points: 0,
    });
    const standings = {
      g1: [mk("a1"), mk("a2"), mk("a3")],
      g2: [mk("b1"), mk("b2")],
    };
    expect(qualifiedTeams(groups, standings)).toEqual(["a1", "a2", "b1"]);
  });
});
