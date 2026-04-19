import { supabase } from "@/integrations/supabase/client";

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

export async function generateFixtures(eventId: string, teamIds: string[]) {
  if (teamIds.length < 2) throw new Error("Need at least 2 teams");

  // wipe existing
  await supabase.from("matches").delete().eq("event_id", eventId);

  const shuffled = shuffle(teamIds);
  const size = nextPowerOfTwo(shuffled.length);
  const totalRounds = Math.log2(size);
  const slots: (string | null)[] = [...shuffled, ...Array(size - shuffled.length).fill(null)];

  const rows: any[] = [];
  // Round 1
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
    });
  }
  // Empty later rounds
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
      });
    }
  }

  const { error } = await supabase.from("matches").insert(rows);
  if (error) throw error;

  // Propagate byes
  await propagateByes(eventId, totalRounds);
}

async function propagateByes(eventId: string, totalRounds: number) {
  for (let r = 1; r < totalRounds; r++) {
    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("event_id", eventId)
      .eq("round", r)
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
  winnerId: string
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
    .maybeSingle();

  if (!nextMatch) return; // final

  const update = slot === "team_a_id" ? { team_a_id: winnerId } : { team_b_id: winnerId };
  await supabase.from("matches").update(update).eq("id", nextMatch.id);
}

export async function submitScore(matchId: string, scoreA: number, scoreB: number) {
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (error || !match) throw error;
  if (scoreA === scoreB) throw new Error("Scores cannot be tied");
  const winnerId = scoreA > scoreB ? match.team_a_id : match.team_b_id;
  if (!winnerId) throw new Error("Cannot determine winner");

  await supabase
    .from("matches")
    .update({ score_a: scoreA, score_b: scoreB, winner_id: winnerId, status: "completed" })
    .eq("id", matchId);

  await advanceWinner(match.event_id, match.round, match.match_number, winnerId);
}

export async function resetFixtures(eventId: string) {
  const { error } = await supabase.from("matches").delete().eq("event_id", eventId);
  if (error) throw error;
}
