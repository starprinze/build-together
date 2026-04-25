import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client used inside bracket.ts
const captured: { matches: any[] } = { matches: [] };
vi.mock("@/integrations/supabase/client", () => {
  const fromImpl = (table: string) => {
    if (table !== "matches") throw new Error("unexpected table " + table);
    return {
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert: (rows: any) => {
        captured.matches.push(...rows);
        return Promise.resolve({ error: null });
      },
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [] }),
              maybeSingle: () => Promise.resolve({ data: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: null }),
            order: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    };
  };
  return { supabase: { from: fromImpl } };
});

import { generateFixtures } from "@/lib/bracket";

beforeEach(() => {
  captured.matches.length = 0;
});

describe("generateFixtures", () => {
  it("rejects fewer than 2 teams", async () => {
    await expect(generateFixtures("e1", ["a"], "single_elim")).rejects.toThrow();
  });

  it("single elimination on 4 teams produces 3 matches across 2 rounds", async () => {
    await generateFixtures("e1", ["a", "b", "c", "d"], "single_elim");
    expect(captured.matches.filter((m) => m.bracket === "main")).toHaveLength(3);
    expect(captured.matches.filter((m) => m.round === 1)).toHaveLength(2);
    expect(captured.matches.filter((m) => m.round === 2)).toHaveLength(1);
  });

  it("single elimination on 3 teams creates a bye in round 1", async () => {
    await generateFixtures("e1", ["a", "b", "c"], "single_elim");
    const r1 = captured.matches.filter((m) => m.round === 1);
    expect(r1).toHaveLength(2);
    expect(r1.some((m) => m.status === "bye")).toBe(true);
  });

  it("round-robin with 4 teams produces n*(n-1)/2 = 6 matches", async () => {
    await generateFixtures("e1", ["a", "b", "c", "d"], "round_robin");
    expect(captured.matches).toHaveLength(6);
  });

  it("league (home & away) doubles round-robin matches", async () => {
    await generateFixtures("e1", ["a", "b", "c", "d"], "league");
    expect(captured.matches).toHaveLength(12);
  });
});
