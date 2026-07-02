// ============================================================================
// Universal Sport Engine
// ----------------------------------------------------------------------------
// Config-driven sport profiles. NO sport-specific logic should live outside
// this module — everything (scoring, standings, winner determination, live
// timeline events) reads from a SportProfile. This keeps the platform fully
// sport-agnostic and provides a clean extension point for new sports and for
// future AI modules.
// ============================================================================

/** How a winner is chosen from two scores. */
export type ScoreDirection = "higher" | "lower";

/** Live-timeline event types a sport can record. */
export type MatchEventType =
  | "goal"
  | "point"
  | "set"
  | "quarter"
  | "period"
  | "card"
  | "foul"
  | "timeout"
  | "substitution"
  | "possession"
  | "penalty"
  | "ace"
  | "note";

export interface StandingsPoints {
  win: number;
  draw: number;
  loss: number;
}

export interface SportProfile {
  /** Canonical key, e.g. "football". */
  id: string;
  /** Display name. */
  name: string;
  /** Emoji used in pickers and cards. */
  icon: string;
  category: "team" | "individual";
  /** Whether a match can end in a draw during regulation. */
  allowsDraw: boolean;
  /** Label for the numeric score column, e.g. "Goals", "Points", "Sets". */
  scoreLabel: string;
  /** Label for a single period, e.g. "Half", "Quarter", "Set", "Round". */
  periodLabel: string;
  /** Number of regulation periods. */
  periods: number;
  /** Whether overtime / extra time can be played. */
  hasOvertime: boolean;
  /** Whether a penalty shootout / tie-break decides drawn matches. */
  hasPenalties: boolean;
  /** Whether the higher or lower score wins (athletics = lower time wins). */
  winnerBy: ScoreDirection;
  /** Points awarded in league/group standings. */
  standingsPoints: StandingsPoints;
  /** Ordered standings tie-breaker keys. */
  tieBreakers: Array<"diff" | "pointsFor" | "wins" | "headToHead">;
  /** Live-timeline event types relevant to this sport. */
  eventTypes: MatchEventType[];
}

// ----------------------------------------------------------------------------
// Registry
// ----------------------------------------------------------------------------

export const SPORT_PROFILES: Record<string, SportProfile> = {
  football: {
    id: "football",
    name: "Football",
    icon: "⚽",
    category: "team",
    allowsDraw: true,
    scoreLabel: "Goals",
    periodLabel: "Half",
    periods: 2,
    hasOvertime: true,
    hasPenalties: true,
    winnerBy: "higher",
    standingsPoints: { win: 3, draw: 1, loss: 0 },
    tieBreakers: ["diff", "pointsFor", "wins"],
    eventTypes: ["goal", "card", "foul", "substitution", "penalty", "possession", "note"],
  },
  basketball: {
    id: "basketball",
    name: "Basketball",
    icon: "🏀",
    category: "team",
    allowsDraw: false,
    scoreLabel: "Points",
    periodLabel: "Quarter",
    periods: 4,
    hasOvertime: true,
    hasPenalties: false,
    winnerBy: "higher",
    standingsPoints: { win: 2, draw: 0, loss: 1 },
    tieBreakers: ["wins", "diff", "pointsFor"],
    eventTypes: ["point", "foul", "timeout", "substitution", "quarter", "note"],
  },
  volleyball: {
    id: "volleyball",
    name: "Volleyball",
    icon: "🏐",
    category: "team",
    allowsDraw: false,
    scoreLabel: "Sets",
    periodLabel: "Set",
    periods: 5,
    hasOvertime: false,
    hasPenalties: false,
    winnerBy: "higher",
    standingsPoints: { win: 3, draw: 0, loss: 0 },
    tieBreakers: ["wins", "diff", "pointsFor"],
    eventTypes: ["set", "point", "ace", "timeout", "substitution", "note"],
  },
  handball: {
    id: "handball",
    name: "Handball",
    icon: "🤾",
    category: "team",
    allowsDraw: true,
    scoreLabel: "Goals",
    periodLabel: "Half",
    periods: 2,
    hasOvertime: true,
    hasPenalties: true,
    winnerBy: "higher",
    standingsPoints: { win: 2, draw: 1, loss: 0 },
    tieBreakers: ["diff", "pointsFor", "wins"],
    eventTypes: ["goal", "card", "timeout", "substitution", "penalty", "note"],
  },
  tennis: {
    id: "tennis",
    name: "Tennis",
    icon: "🎾",
    category: "individual",
    allowsDraw: false,
    scoreLabel: "Sets",
    periodLabel: "Set",
    periods: 3,
    hasOvertime: false,
    hasPenalties: false,
    winnerBy: "higher",
    standingsPoints: { win: 1, draw: 0, loss: 0 },
    tieBreakers: ["wins", "diff"],
    eventTypes: ["set", "point", "ace", "note"],
  },
  table_tennis: {
    id: "table_tennis",
    name: "Table Tennis",
    icon: "🏓",
    category: "individual",
    allowsDraw: false,
    scoreLabel: "Games",
    periodLabel: "Game",
    periods: 5,
    hasOvertime: false,
    hasPenalties: false,
    winnerBy: "higher",
    standingsPoints: { win: 1, draw: 0, loss: 0 },
    tieBreakers: ["wins", "diff"],
    eventTypes: ["point", "set", "timeout", "note"],
  },
  badminton: {
    id: "badminton",
    name: "Badminton",
    icon: "🏸",
    category: "individual",
    allowsDraw: false,
    scoreLabel: "Games",
    periodLabel: "Game",
    periods: 3,
    hasOvertime: false,
    hasPenalties: false,
    winnerBy: "higher",
    standingsPoints: { win: 1, draw: 0, loss: 0 },
    tieBreakers: ["wins", "diff"],
    eventTypes: ["point", "set", "note"],
  },
  athletics: {
    id: "athletics",
    name: "Athletics",
    icon: "🏃",
    category: "individual",
    allowsDraw: false,
    scoreLabel: "Result",
    periodLabel: "Heat",
    periods: 1,
    hasOvertime: false,
    hasPenalties: false,
    winnerBy: "lower", // fastest time / lowest value wins for timed events
    standingsPoints: { win: 1, draw: 0, loss: 0 },
    tieBreakers: ["wins"],
    eventTypes: ["note"],
  },
  chess: {
    id: "chess",
    name: "Chess",
    icon: "♟️",
    category: "individual",
    allowsDraw: true,
    scoreLabel: "Points",
    periodLabel: "Round",
    periods: 1,
    hasOvertime: false,
    hasPenalties: false,
    winnerBy: "higher",
    standingsPoints: { win: 1, draw: 0, loss: 0 }, // classic chess: draw = 0.5 handled via score
    tieBreakers: ["headToHead", "wins"],
    eventTypes: ["note"],
  },
  esports: {
    id: "esports",
    name: "Esports",
    icon: "🎮",
    category: "team",
    allowsDraw: false,
    scoreLabel: "Maps",
    periodLabel: "Map",
    periods: 3,
    hasOvertime: true,
    hasPenalties: false,
    winnerBy: "higher",
    standingsPoints: { win: 3, draw: 0, loss: 0 },
    tieBreakers: ["wins", "diff"],
    eventTypes: ["point", "note"],
  },
};

/** Football-shaped fallback so legacy events with unknown sport keep working. */
export const DEFAULT_SPORT_PROFILE: SportProfile = SPORT_PROFILES.football;

/** Normalize a free-text sport value to a registry key. */
export function normalizeSportKey(sport?: string | null): string {
  if (!sport) return DEFAULT_SPORT_PROFILE.id;
  const raw = sport.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (SPORT_PROFILES[raw]) return raw;
  // Match on display name (e.g. "Table Tennis")
  const byName = Object.values(SPORT_PROFILES).find(
    (p) => p.name.toLowerCase() === sport.trim().toLowerCase(),
  );
  return byName?.id ?? DEFAULT_SPORT_PROFILE.id;
}

/** Resolve a SportProfile from any free-text sport value. Never throws. */
export function getSportProfile(sport?: string | null): SportProfile {
  return SPORT_PROFILES[normalizeSportKey(sport)] ?? DEFAULT_SPORT_PROFILE;
}

/** All profiles as a stable, alphabetized list for pickers. */
export function listSportProfiles(): SportProfile[] {
  return Object.values(SPORT_PROFILES).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Determine a winner from two scores using the sport's rules.
 * Returns "a", "b", "draw" (only if the sport allows draws), or null when
 * scores are missing.
 */
export function determineWinner(
  profile: SportProfile,
  scoreA: number | null | undefined,
  scoreB: number | null | undefined,
): "a" | "b" | "draw" | null {
  if (scoreA == null || scoreB == null) return null;
  if (scoreA === scoreB) return profile.allowsDraw ? "draw" : null;
  const aWins = profile.winnerBy === "higher" ? scoreA > scoreB : scoreA < scoreB;
  return aWins ? "a" : "b";
}
