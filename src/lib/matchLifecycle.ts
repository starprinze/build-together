import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Phase 4 — Match lifecycle
// Central, sport-agnostic definition of match states and safe transitions.
// The live match center reads from here so new states never require scattered
// string literals across the UI.
// ============================================================================

export type MatchStatus =
  | "pending"
  | "ready"
  | "live"
  | "halftime"
  | "break"
  | "extra_time"
  | "penalties"
  | "completed"
  | "walkover"
  | "postponed"
  | "abandoned"
  | "cancelled"
  | "bye";

export interface StatusMeta {
  value: MatchStatus;
  label: string;
  /** Tailwind-ish tone key used for badges. */
  tone: "neutral" | "live" | "done" | "warn";
  /** True while the match is actively being played (score entry allowed). */
  playable: boolean;
}

export const MATCH_STATUS_META: Record<MatchStatus, StatusMeta> = {
  pending: { value: "pending", label: "Pending", tone: "neutral", playable: false },
  ready: { value: "ready", label: "Ready", tone: "neutral", playable: false },
  live: { value: "live", label: "Live", tone: "live", playable: true },
  halftime: { value: "halftime", label: "Half-time", tone: "live", playable: true },
  break: { value: "break", label: "Break", tone: "live", playable: true },
  extra_time: { value: "extra_time", label: "Extra time", tone: "live", playable: true },
  penalties: { value: "penalties", label: "Penalties", tone: "live", playable: true },
  completed: { value: "completed", label: "Completed", tone: "done", playable: false },
  walkover: { value: "walkover", label: "Walkover", tone: "warn", playable: false },
  postponed: { value: "postponed", label: "Postponed", tone: "warn", playable: false },
  abandoned: { value: "abandoned", label: "Abandoned", tone: "warn", playable: false },
  cancelled: { value: "cancelled", label: "Cancelled", tone: "warn", playable: false },
  bye: { value: "bye", label: "Bye", tone: "neutral", playable: false },
};

export function statusMeta(status: string): StatusMeta {
  return MATCH_STATUS_META[status as MatchStatus] ?? MATCH_STATUS_META.pending;
}

/** In-play phases an organizer can toggle during a live match. */
export const LIVE_PHASES: MatchStatus[] = [
  "live",
  "halftime",
  "break",
  "extra_time",
  "penalties",
];

/** Administrative outcomes that end a match without a normal finish. */
export const ADMIN_OUTCOMES: MatchStatus[] = ["walkover", "postponed", "abandoned"];

/** Set an arbitrary lifecycle status (no score/winner change). */
export async function setMatchStatus(matchId: string, status: MatchStatus) {
  const { error } = await supabase.from("matches").update({ status }).eq("id", matchId);
  if (error) throw error;
}

/**
 * Record a walkover: the given team wins, scores are cleared, match completed.
 */
export async function recordWalkover(matchId: string, winnerId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: "walkover", winner_id: winnerId })
    .eq("id", matchId);
  if (error) throw error;
}
