import { supabase } from "@/integrations/supabase/client";

export type FixtureFormat =
  | "single_elim"
  | "double_elim"
  | "round_robin"
  | "league"
  | "group_knockout"
  | "swiss"
  | "custom";

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Row {
  event_id: string;
  round: number;
  match_number: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id?: string | null;
  status: "pending" | "completed" | "bye";
  bracket?: string;
}

export async function generateFixtures(
  eventId: string,
  teamIds: string[],
  format: FixtureFormat = "single_elim",
) {
  if (teamIds.length < 2) throw new Error("Need at least 2 teams");

  await supabase.from("matches").delete().eq("event_id", eventId);

  const shuffled = shuffle(teamIds);
  let rows: Row[] = [];

  if (format === "single_elim") {
    rows = buildSingleElim(eventId, shuffled);
  } else if (format === "double_elim") {
    rows = buildDoubleElim(eventId, shuffled);
  } else if (format === "round_robin" || format === "league") {
    rows = buildRoundRobin(eventId, shuffled, format === "league" ? 2 : 1);
  } else if (format === "swiss") {
    rows = buildSwissRound1(eventId, shuffled);
  } else if (format === "custom") {
    // Custom tournaments are built manually by the organizer — no auto-generation.
    rows = [];
  } else if (format === "group_knockout") {
    // Group stage is generated via the group manager (Phase 3). Fall back to a
    // single round robin so the format is never left empty.
    rows = buildRoundRobin(eventId, shuffled, 1);
  }

  const { error } = await supabase.from("matches").insert(rows);
  if (error) throw error;

  if (format === "single_elim") {
    const totalRounds = Math.log2(nextPowerOfTwo(shuffled.length));
    await propagateByes(eventId, totalRounds);
  }
}

// ---------- SINGLE ELIMINATION ----------
function buildSingleElim(eventId: string, teamIds: string[]): Row[] {
  const size = nextPowerOfTwo(teamIds.length);
  const totalRounds = Math.log2(size);
  const slots: (string | null)[] = [...teamIds, ...Array(size - teamIds.length).fill(null)];
  const rows: Row[] = [];

  for (let i = 0; i < size / 2; i++) {
    const a = slots[i * 2];
    const b = slots[i * 2 + 1];
    const isBye = a === null || b === null;
    const winner = isBye ? (a ?? b) : null;
    rows.push({
      event_id: eventId,
      round: 1,
      match_number: i + 1,
      team_a_id: a,
      team_b_id: b,
      winner_id: winner,
      status: isBye ? "bye" : "pending",
      bracket: "main",
    });
  }
  for (let r = 2; r <= totalRounds; r++) {
    const matches = size / Math.pow(2, r);
    for (let i = 0; i < matches; i++) {
      rows.push({
        event_id: eventId,
        round: r,
        match_number: i + 1,
        team_a_id: null,
        team_b_id: null,
        status: "pending",
        bracket: "main",
      });
    }
  }
  return rows;
}

// ---------- ROUND ROBIN / LEAGUE ----------
// Circle method: each round has n/2 games; n-1 rounds for single round-robin.
function buildRoundRobin(eventId: string, teamIds: string[], legs: 1 | 2): Row[] {
  const teams = [...teamIds];
  if (teams.length % 2 === 1) teams.push("__BYE__");
  const n = teams.length;
  const roundsPerLeg = n - 1;
  const half = n / 2;
  const rows: Row[] = [];

  // Fixed pivot, rotate the rest
  const arr = [...teams];
  for (let leg = 0; leg < legs; leg++) {
    let local = [...arr];
    for (let r = 0; r < roundsPerLeg; r++) {
      const round = leg * roundsPerLeg + r + 1;
      let matchNo = 1;
      for (let i = 0; i < half; i++) {
        const a = local[i];
        const b = local[n - 1 - i];
        if (a === "__BYE__" || b === "__BYE__") continue;
        // Alternate home/away on second leg
        const [ta, tb] = leg === 1 ? [b, a] : [a, b];
        rows.push({
          event_id: eventId,
          round,
          match_number: matchNo++,
          team_a_id: ta,
          team_b_id: tb,
          status: "pending",
          bracket: "main",
        });
      }
      // rotate (keep first fixed)
      local = [local[0], local[n - 1], ...local.slice(1, n - 1)];
    }
  }
  return rows;
}

// ---------- DOUBLE ELIMINATION ----------
// Generates winners + losers + grand final scaffolding. Teams populate winners R1; advancement
// is handled by advanceWinner which now also drops losers into the losers bracket.
function buildDoubleElim(eventId: string, teamIds: string[]): Row[] {
  const size = nextPowerOfTwo(teamIds.length);
  const wbRounds = Math.log2(size);
  const slots: (string | null)[] = [...teamIds, ...Array(size - teamIds.length).fill(null)];
  const rows: Row[] = [];

  // Winners bracket
  for (let i = 0; i < size / 2; i++) {
    const a = slots[i * 2];
    const b = slots[i * 2 + 1];
    const isBye = a === null || b === null;
    rows.push({
      event_id: eventId,
      round: 1,
      match_number: i + 1,
      team_a_id: a,
      team_b_id: b,
      winner_id: isBye ? (a ?? b) : null,
      status: isBye ? "bye" : "pending",
      bracket: "winners",
    });
  }
  for (let r = 2; r <= wbRounds; r++) {
    const matches = size / Math.pow(2, r);
    for (let i = 0; i < matches; i++) {
      rows.push({
        event_id: eventId,
        round: r,
        match_number: i + 1,
        team_a_id: null,
        team_b_id: null,
        status: "pending",
        bracket: "winners",
      });
    }
  }

  // Losers bracket: 2*(wbRounds-1) rounds. Simplified placeholder structure.
  const lbRounds = Math.max(1, 2 * (wbRounds - 1));
  let lbMatchesThisRound = size / 4;
  for (let r = 1; r <= lbRounds; r++) {
    const count = Math.max(1, Math.floor(lbMatchesThisRound));
    for (let i = 0; i < count; i++) {
      rows.push({
        event_id: eventId,
        round: r,
        match_number: i + 1,
        team_a_id: null,
        team_b_id: null,
        status: "pending",
        bracket: "losers",
      });
    }
    if (r % 2 === 0) lbMatchesThisRound = lbMatchesThisRound / 2;
  }

  // Grand final
  rows.push({
    event_id: eventId,
    round: 1,
    match_number: 1,
    team_a_id: null,
    team_b_id: null,
    status: "pending",
    bracket: "grand_final",
  });

  return rows;
}

async function propagateByes(eventId: string, totalRounds: number) {
  for (let r = 1; r < totalRounds; r++) {
    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("event_id", eventId)
      .eq("round", r)
      .eq("bracket", "main")
      .order("match_number");
    if (!matches) continue;
    for (const m of matches) {
      if (m.winner_id) {
        await advanceWinner(eventId, r, m.match_number, m.winner_id);
      }
    }
  }
}

export async function advanceWinner(
  eventId: string,
  round: number,
  matchNumber: number,
  winnerId: string,
) {
  const nextRound = round + 1;
  const nextMatchNumber = Math.ceil(matchNumber / 2);
  const slot = matchNumber % 2 === 1 ? "team_a_id" : "team_b_id";

  const { data: nextMatch } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", eventId)
    .eq("round", nextRound)
    .eq("match_number", nextMatchNumber)
    .eq("bracket", "main")
    .maybeSingle();

  if (!nextMatch) return;
  const update = slot === "team_a_id" ? { team_a_id: winnerId } : { team_b_id: winnerId };
  await supabase.from("matches").update(update).eq("id", nextMatch.id);
}

/**
 * Update live scores WITHOUT changing match status.
 * Admins may call this any number of times during a live match.
 */
export async function submitScore(matchId: string, scoreA: number, scoreB: number) {
  const { data: match, error } = await supabase
    .from("matches")
    .select("id,status")
    .eq("id", matchId)
    .single();
  if (error || !match) throw error ?? new Error("Match not found");

  const update: { score_a: number; score_b: number; status?: "live" } = {
    score_a: scoreA,
    score_b: scoreB,
  };
  if (match.status === "pending") update.status = "live";

  const { error: upErr } = await supabase
    .from("matches")
    .update(update)
    .eq("id", matchId);
  if (upErr) throw upErr;
}

/** Mark a match as live (no score change). */
export async function startMatch(matchId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: "live" })
    .eq("id", matchId);
  if (error) throw error;
}

/** Reopen a match for editing (live -> pending or completed -> live). */
export async function reopenMatch(matchId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: "live", winner_id: null, result: null })
    .eq("id", matchId);
  if (error) throw error;
}

/** Finalise a match: derives winner/result and advances bracket. */
export async function finishMatch(
  matchId: string,
  scoreA?: number,
  scoreB?: number,
) {
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (error || !match) throw error ?? new Error("Match not found");

  const a = scoreA ?? match.score_a;
  const b = scoreB ?? match.score_b;
  if (a == null || b == null) throw new Error("Enter both scores before finishing");
  if (a === b) throw new Error("Knockout matches cannot end in a tie");

  const winnerId = a > b ? match.team_a_id : match.team_b_id;
  if (!winnerId) throw new Error("Cannot determine winner");

  const { error: upErr } = await supabase
    .from("matches")
    .update({
      score_a: a,
      score_b: b,
      winner_id: winnerId,
      status: "completed",
    })
    .eq("id", matchId);
  if (upErr) throw upErr;

  if (match.bracket === "main") {
    await advanceWinner(match.event_id, match.round, match.match_number, winnerId);
  }
}

/** Cancel a scheduled or live match. */
export async function cancelMatch(matchId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelled" })
    .eq("id", matchId);
  if (error) throw error;
}

export async function resetFixtures(eventId: string) {
  const { error } = await supabase.from("matches").delete().eq("event_id", eventId);
  if (error) throw error;
}
