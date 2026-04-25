import { describe, it, expect } from "vitest";
import { computeStandings } from "@/lib/standings";
import type { MatchRow } from "@/components/BracketView";

const team = (id: string, name: string) => ({ id, name, department: "X" });

const m = (over: Partial<MatchRow>): MatchRow => ({
  id: crypto.randomUUID(),
  round: 1,
  match_number: 1,
  team_a_id: null,
  team_b_id: null,
  score_a: null,
  score_b: null,
  winner_id: null,
  status: "pending",
  team_a: null,
  team_b: null,
  winner: null,
  ...over,
});

describe("computeStandings", () => {
  it("returns empty for no matches", () => {
    expect(computeStandings([])).toEqual([]);
  });

  it("seeds teams that appear on the bracket even with no completed games", () => {
    const A = team("a", "Alpha");
    const B = team("b", "Bravo");
    const rows = computeStandings([
      m({ team_a_id: "a", team_b_id: "b", team_a: A, team_b: B }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it("awards 3 points per win and ranks by points then diff", () => {
    const A = team("a", "Alpha");
    const B = team("b", "Bravo");
    const C = team("c", "Charlie");
    const rows = computeStandings([
      m({ team_a_id: "a", team_b_id: "b", team_a: A, team_b: B,
          score_a: 3, score_b: 1, winner_id: "a", status: "completed",
          winner: { id: "a", name: "Alpha" } }),
      m({ team_a_id: "a", team_b_id: "c", team_a: A, team_b: C,
          score_a: 2, score_b: 0, winner_id: "a", status: "completed",
          winner: { id: "a", name: "Alpha" } }),
      m({ team_a_id: "b", team_b_id: "c", team_a: B, team_b: C,
          score_a: 1, score_b: 0, winner_id: "b", status: "completed",
          winner: { id: "b", name: "Bravo" } }),
    ]);
    expect(rows[0].name).toBe("Alpha");
    expect(rows[0].points).toBe(6);
    expect(rows[1].name).toBe("Bravo");
    expect(rows[1].points).toBe(3);
    expect(rows[2].name).toBe("Charlie");
    expect(rows[2].losses).toBe(2);
  });

  it("ignores byes", () => {
    const A = team("a", "Alpha");
    const rows = computeStandings([
      m({ team_a_id: "a", team_b_id: null, team_a: A, status: "bye", winner_id: "a" }),
    ]);
    expect(rows[0].played).toBe(0);
    expect(rows[0].wins).toBe(0);
  });
});
