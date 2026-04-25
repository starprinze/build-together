import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BracketView, type MatchRow } from "./BracketView";

const mk = (over: Partial<MatchRow>): MatchRow => ({
  id: over.id ?? "m1",
  round: 1,
  match_number: 1,
  team_a_id: "a",
  team_b_id: "b",
  score_a: null,
  score_b: null,
  winner_id: null,
  status: "pending",
  team_a: { id: "a", name: "Alpha" },
  team_b: { id: "b", name: "Bravo" },
  winner: null,
  ...over,
});

const renderWith = (matches: MatchRow[]) =>
  render(
    <MemoryRouter>
      <BracketView matches={matches} />
    </MemoryRouter>,
  );

describe("BracketView", () => {
  it("renders team names and a Final round label for the last round", () => {
    renderWith([mk({})]);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.getByText(/final/i)).toBeInTheDocument();
  });

  it("shows a Live pill for pending matches with both teams set", () => {
    renderWith([mk({})]);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows a Pending pill when teams aren't set yet", () => {
    renderWith([mk({ team_a_id: null, team_b_id: null, team_a: null, team_b: null })]);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getAllByText("TBD").length).toBeGreaterThan(0);
  });

  it("shows Finished and the winner highlight for completed matches", () => {
    renderWith([
      mk({
        status: "completed",
        score_a: 21,
        score_b: 18,
        winner_id: "a",
        winner: { id: "a", name: "Alpha" },
      }),
    ]);
    expect(screen.getByText("Finished")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });
});
