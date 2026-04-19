import type { MatchRow } from "@/components/BracketView";

export interface StandingRow {
  teamId: string;
  name: string;
  department?: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number; // 3 per win, 0 per loss
}

/**
 * Compute standings for an event from its matches.
 * Byes do not count toward W/L or points.
 */
export function computeStandings(matches: MatchRow[]): StandingRow[] {
  const map = new Map<string, StandingRow>();

  const ensure = (team: { id: string; name: string; department?: string } | null) => {
    if (!team) return null;
    let row = map.get(team.id);
    if (!row) {
      row = {
        teamId: team.id,
        name: team.name,
        department: team.department,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        points: 0,
      };
      map.set(team.id, row);
    }
    return row;
  };

  for (const m of matches) {
    // Always seed teams that exist on the bracket so every registered team appears.
    ensure(m.team_a);
    ensure(m.team_b);

    if (m.status !== "completed" || !m.winner_id) continue;
    if (!m.team_a || !m.team_b) continue; // skip byes

    const a = ensure(m.team_a)!;
    const b = ensure(m.team_b)!;
    const sa = m.score_a ?? 0;
    const sb = m.score_b ?? 0;

    a.played += 1;
    b.played += 1;
    a.pointsFor += sa;
    a.pointsAgainst += sb;
    b.pointsFor += sb;
    b.pointsAgainst += sa;

    if (m.winner_id === a.teamId) {
      a.wins += 1;
      a.points += 3;
      b.losses += 1;
    } else if (m.winner_id === b.teamId) {
      b.wins += 1;
      b.points += 3;
      a.losses += 1;
    }
  }

  for (const row of map.values()) row.diff = row.pointsFor - row.pointsAgainst;

  return Array.from(map.values()).sort(
    (x, y) =>
      y.points - x.points ||
      y.diff - x.diff ||
      y.pointsFor - x.pointsFor ||
      x.name.localeCompare(y.name),
  );
}
