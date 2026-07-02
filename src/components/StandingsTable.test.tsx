import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StandingsTable } from "./StandingsTable";
import type { StandingRow } from "@/lib/standings";

describe("StandingsTable", () => {
  it("shows an empty state when there are no rows", () => {
    render(
      <MemoryRouter>
        <StandingsTable rows={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no standings yet/i)).toBeInTheDocument();
  });

  it("renders rows in the provided order with team names and points", () => {
    const rows: StandingRow[] = [
      {
        teamId: "a",
        name: "Alpha",
        department: "CS",
        played: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        pointsFor: 30,
        pointsAgainst: 10,
        diff: 20,
        points: 6,
      },
      {
        teamId: "b",
        name: "Bravo",
        department: "ME",
        played: 2,
        wins: 0,
        draws: 0,
        losses: 2,
        pointsFor: 10,
        pointsAgainst: 30,
        diff: -20,
        points: 0,
      },
    ];
    render(
      <MemoryRouter>
        <StandingsTable rows={rows} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.getByText("+20")).toBeInTheDocument();
    expect(screen.getByText("-20")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
