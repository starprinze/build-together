import type { MatchRow } from "@/components/BracketView";
import { DEFAULT_SPORT_PROFILE, type SportProfile } from "@/lib/sports";

export interface StandingRow {
  teamId: string;
  name: string;
  department?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number; // driven by the sport's standingsPoints config
}

/**
 * Compute standings for an event from its matches.
 * Points, draw handling and tie-breakers are driven by the sport profile so
 * the calculation is fully sport-agnostic. Byes do not count toward records.
 */
export function computeStandings(
  matches: MatchRow[],
  profile: SportProfile = DEFAULT_SPORT_PROFILE,
): StandingRow[] {
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
        draws: 0,
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

  const pts = profile.standingsPoints;

  for (const m of matches) {
    // Always seed teams that exist on the bracket so every registered team appears.
    ensure(m.team_a);
    ensure(m.team_b);

    if (m.status !== "completed") continue;
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

    const isDraw = !m.winner_id && profile.allowsDraw && sa === sb;

    if (isDraw) {
      a.draws += 1;
      b.draws += 1;
      a.points += pts.draw;
      b.points += pts.draw;
    } else if (m.winner_id === a.teamId) {
      a.wins += 1;
      a.points += pts.win;
      b.losses += 1;
      b.points += pts.loss;
    } else if (m.winner_id === b.teamId) {
      b.wins += 1;
      b.points += pts.win;
      a.losses += 1;
      a.points += pts.loss;
    } else {
      // Completed match without a decisive/draw result — ignore scoring.
      a.played -= 1;
      b.played -= 1;
    }
  }

  for (const row of map.values()) row.diff = row.pointsFor - row.pointsAgainst;

  const tb = profile.tieBreakers;
  const cmpKey = (r: StandingRow, key: string) =>
    key === "diff" ? r.diff : key === "pointsFor" ? r.pointsFor : key === "wins" ? r.wins : 0;

  return Array.from(map.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    for (const key of tb) {
      const d = cmpKey(y, key) - cmpKey(x, key);
      if (d !== 0) return d;
    }
    return x.name.localeCompare(y.name);
  });
}
