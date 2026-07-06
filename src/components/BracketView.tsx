import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MapPin, CalendarClock } from "lucide-react";

export interface EventInfo {
  id: string;
  name: string;
  sport: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface MatchRow {
  id: string;
  round: number;
  match_number: number;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: string | null;
  status: "pending" | "live" | "completed" | "cancelled" | "bye" | string;
  prediction_deadline?: string | null;
  result?: "team_a" | "team_b" | "draw" | null;
  bracket?: string | null;
  group_id?: string | null;
  label?: string | null;
  venue?: string | null;
  scheduled_at?: string | null;
  team_a: { id: string; name: string; department?: string } | null;
  team_b: { id: string; name: string; department?: string } | null;
  winner: { id: string; name: string } | null;
}

const roundLabel = (round: number, total: number) => {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${round}`;
};

const shortRoundLabel = (round: number, total: number) => {
  const fromEnd = total - round;
  if (fromEnd === 0) return "F";
  if (fromEnd === 1) return "SF";
  if (fromEnd === 2) return "QF";
  return `R${round}`;
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Knockout bracket only. Group-stage matches must be filtered out before this
 * component receives them — it renders a connected elimination tree that
 * auto-populates each round's placeholders from the feeding matches.
 */
export function BracketView({
  matches,
  onScoreClick,
  onDetailsClick,
}: {
  matches: MatchRow[];
  onScoreClick?: (m: MatchRow) => void;
  onDetailsClick?: (m: MatchRow) => void;
}) {
  const totalRounds = matches.length ? Math.max(...matches.map((m) => m.round)) : 0;
  const rounds: MatchRow[][] = Array.from({ length: totalRounds }, () => []);
  matches.forEach((m) => rounds[m.round - 1]?.push(m));
  rounds.forEach((r) => r.sort((a, b) => a.match_number - b.match_number));

  // Placeholder label for an empty slot: derived from the feeding match.
  const slotLabel = (match: MatchRow, roundIdx: number, slot: "a" | "b"): string => {
    const team = slot === "a" ? match.team_a : match.team_b;
    if (team) return team.name;
    if (roundIdx === 0) {
      // First knockout round: use a stored seed label (e.g. "A1") if present.
      return match.label?.trim() || "TBD";
    }
    const feederNumber = slot === "a" ? match.match_number * 2 - 1 : match.match_number * 2;
    return `Winner ${shortRoundLabel(roundIdx, totalRounds)} ${feederNumber}`;
  };

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="kbracket min-w-fit">
        {rounds.map((roundMatches, idx) => {
          const isFinal = idx === rounds.length - 1;
          // Group non-final rounds into feeder pairs for connector lines.
          const pairs: MatchRow[][] = [];
          if (!isFinal) {
            for (let i = 0; i < roundMatches.length; i += 2) {
              pairs.push(roundMatches.slice(i, i + 2));
            }
          }
          return (
            <div key={idx} className={cn("kround", isFinal && "kfinal")}>
              <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3 pl-1">
                {roundLabel(idx + 1, totalRounds)}
              </div>
              {isFinal
                ? roundMatches.map((m) => (
                    <div key={m.id} className="kcell">
                      <MatchCard
                        match={m}
                        roundIdx={idx}
                        slotLabel={slotLabel}
                        onScoreClick={onScoreClick}
                        onDetailsClick={onDetailsClick}
                        highlight
                      />
                    </div>
                  ))
                : pairs.map((pair, pi) => (
                    <div key={pi} className="kpair">
                      {pair.map((m) => (
                        <div key={m.id} className="kcell">
                          <MatchCard
                            match={m}
                            roundIdx={idx}
                            slotLabel={slotLabel}
                            onScoreClick={onScoreClick}
                            onDetailsClick={onDetailsClick}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  roundIdx,
  slotLabel,
  onScoreClick,
  onDetailsClick,
  highlight,
}: {
  match: MatchRow;
  roundIdx: number;
  slotLabel: (m: MatchRow, roundIdx: number, slot: "a" | "b") => string;
  onScoreClick?: (m: MatchRow) => void;
  onDetailsClick?: (m: MatchRow) => void;
  highlight?: boolean;
}) {
  const isBye = match.status === "bye";
  const isCompleted = match.status === "completed";
  const isLive =
    match.status === "live" ||
    match.status === "halftime" ||
    match.status === "extra_time" ||
    match.status === "penalties" ||
    match.status === "break";
  const canEdit =
    !!(match.team_a_id && match.team_b_id) && !isBye && match.status !== "cancelled";
  const when = fmtDate(match.scheduled_at);

  return (
    <Card
      className={cn(
        "w-full p-0 overflow-hidden rounded-xl border-border/60 shadow-card transition-shadow",
        isLive && "ring-1 ring-destructive/50",
        highlight && "ring-1 ring-primary/40 bg-primary/[0.03]",
      )}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Match {match.match_number}
          {isBye && " · auto-advance"}
        </span>
        <StatusPill status={match.status} />
      </div>
      <TeamRow
        name={slotLabel(match, roundIdx, "a")}
        teamId={match.team_a?.id ?? null}
        placeholder={!match.team_a}
        score={match.score_a}
        winner={isCompleted && match.winner_id === match.team_a_id}
      />
      <div className="h-px bg-border/70 mx-3" />
      <TeamRow
        name={slotLabel(match, roundIdx, "b")}
        teamId={match.team_b?.id ?? null}
        placeholder={!match.team_b}
        score={match.score_b}
        winner={isCompleted && match.winner_id === match.team_b_id}
      />
      {(when || match.venue) && (
        <div className="px-3 pt-1.5 pb-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {when && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> {when}
            </span>
          )}
          {match.venue && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {match.venue}
            </span>
          )}
        </div>
      )}
      {(onDetailsClick || (canEdit && onScoreClick)) && !isBye && (
        <div className="px-3 py-2 bg-muted/30 border-t border-border/60 flex items-center justify-end gap-3">
          {onDetailsClick && (
            <button
              onClick={() => onDetailsClick(match)}
              className="text-xs font-medium text-muted-foreground hover:text-primary"
            >
              Details
            </button>
          )}
          {canEdit && onScoreClick && (
            <button
              onClick={() => onScoreClick(match)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {isCompleted ? "Edit" : isLive ? "Update" : "+ Score"}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: "Finished", cls: "bg-primary/10 text-primary" },
    live: { label: "Live", cls: "bg-destructive/15 text-destructive" },
    pending: { label: "Upcoming", cls: "bg-muted text-muted-foreground" },
    ready: { label: "Ready", cls: "bg-muted text-muted-foreground" },
    halftime: { label: "Half-time", cls: "bg-destructive/15 text-destructive" },
    break: { label: "Break", cls: "bg-destructive/15 text-destructive" },
    extra_time: { label: "Extra time", cls: "bg-destructive/15 text-destructive" },
    penalties: { label: "Penalties", cls: "bg-destructive/15 text-destructive" },
    walkover: { label: "Walkover", cls: "bg-amber-500/15 text-amber-600" },
    postponed: { label: "Postponed", cls: "bg-amber-500/15 text-amber-600" },
    abandoned: { label: "Abandoned", cls: "bg-amber-500/15 text-amber-600" },
    bye: { label: "Bye", cls: "bg-muted text-muted-foreground" },
    cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground line-through" },
  };
  const live =
    status === "live" ||
    status === "halftime" ||
    status === "break" ||
    status === "extra_time" ||
    status === "penalties";
  const { label, cls } = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-1",
        cls,
      )}
    >
      {live && <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />}
      {label}
    </span>
  );
}

function TeamRow({
  name,
  teamId,
  placeholder,
  score,
  winner,
}: {
  name: string;
  teamId: string | null;
  placeholder?: boolean;
  score: number | null;
  winner: boolean;
}) {
  const nameNode = (
    <span
      className={cn(
        "text-sm truncate",
        placeholder && "text-muted-foreground italic",
        winner ? "font-semibold text-foreground" : "text-foreground",
        teamId && "hover:text-primary hover:underline underline-offset-2",
      )}
    >
      {name}
    </span>
  );
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 transition-colors",
        winner && "bg-primary/5",
      )}
    >
      {teamId ? (
        <Link to={`/teams/${teamId}`} className="min-w-0 flex-1">
          {nameNode}
        </Link>
      ) : (
        <span className="min-w-0 flex-1">{nameNode}</span>
      )}
      <span
        className={cn(
          "ml-3 text-sm font-mono tabular-nums w-7 text-right",
          winner ? "text-primary font-bold" : "text-muted-foreground",
        )}
      >
        {score ?? "—"}
      </span>
    </div>
  );
}
