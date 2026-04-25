import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  status: "pending" | "completed" | "bye";
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
  matches.forEach((m) => rounds[m.round - 1].push(m));

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
      <div className="flex gap-4 sm:gap-6 min-w-fit">
        {rounds.map((roundMatches, idx) => (
          <div key={idx} className="flex flex-col min-w-[240px] sm:min-w-[260px] snap-start">
            <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {roundLabel(idx + 1, totalRounds)}
            </div>
            <div className="flex flex-col justify-around flex-1 gap-3">
              {roundMatches.map((m) => (
                <MatchCard key={m.id} match={m} onScoreClick={onScoreClick} onDetailsClick={onDetailsClick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  onScoreClick,
  onDetailsClick,
}: {
  match: MatchRow;
  onScoreClick?: (m: MatchRow) => void;
  onDetailsClick?: (m: MatchRow) => void;
}) {
  const isBye = match.status === "bye";
  const isCompleted = match.status === "completed";
  const canScore = !!(match.team_a_id && match.team_b_id) && !isCompleted && !isBye;

  return (
    <Card className="p-0 overflow-hidden shadow-card">
      <TeamRow
        name={match.team_a?.name ?? (isBye && !match.team_a ? "BYE" : "TBD")}
        teamId={match.team_a?.id ?? null}
        score={match.score_a}
        winner={isCompleted && match.winner_id === match.team_a_id}
      />
      <div className="h-px bg-border" />
      <TeamRow
        name={match.team_b?.name ?? (isBye && !match.team_b ? "BYE" : "TBD")}
        teamId={match.team_b?.id ?? null}
        score={match.score_b}
        winner={isCompleted && match.winner_id === match.team_b_id}
      />
      <div className="px-3 py-2 bg-muted/40 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
            Match {match.match_number} {isBye && "· auto-advance"}
          </span>
          <StatusPill status={match.status} hasTeams={!!(match.team_a_id && match.team_b_id)} />
        </div>
        <div className="flex items-center gap-3">
          {onDetailsClick && !isBye && (
            <button
              onClick={() => onDetailsClick(match)}
              className="text-xs font-medium text-muted-foreground hover:text-primary"
            >
              Details
            </button>
          )}
          {canScore && onScoreClick && (
            <button
              onClick={() => onScoreClick(match)}
              className="text-xs font-medium text-primary hover:underline"
            >
              + Score
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusPill({ status, hasTeams }: { status: MatchRow["status"]; hasTeams: boolean }) {
  const label = status === "completed"
    ? "Finished"
    : status === "bye"
      ? "Bye"
      : hasTeams
        ? "Live"
        : "Pending";
  const cls = status === "completed"
    ? "bg-primary/10 text-primary"
    : status === "bye"
      ? "bg-muted text-muted-foreground"
      : hasTeams
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider", cls)}>
      {label}
    </span>
  );
}

function TeamRow({
  name,
  teamId,
  score,
  winner,
}: {
  name: string;
  teamId: string | null;
  score: number | null;
  winner: boolean;
}) {
  const nameNode = (
    <span
      className={cn(
        "text-sm truncate",
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
        "flex items-center justify-between px-4 py-3 transition-colors",
        winner && "bg-accent",
      )}
    >
      {teamId ? (
        <Link to={`/teams/${teamId}`} className="min-w-0 flex-1">
          {nameNode}
        </Link>
      ) : (
        nameNode
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
