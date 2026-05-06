import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, Trophy, X, Loader2 } from "lucide-react";

type Choice = "team_a" | "team_b" | "draw";

interface Props {
  matchId: string;
  teamAName: string;
  teamBName: string;
  predictionDeadline: string | null;
  result: Choice | null;
  status: string;
}

function friendlyError(message?: string | null): string {
  if (!message) return "Something went wrong. Please try again.";
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("violates row-level"))
    return "Predictions are closed for this match.";
  if (m.includes("duplicate key") || m.includes("unique constraint"))
    return "You already submitted a prediction for this match.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error. Check your connection and try again.";
  return message;
}

export function MatchPrediction({
  matchId,
  teamAName,
  teamBName,
  predictionDeadline,
  result,
  status,
}: Props) {
  const { user } = useAuth();
  const [pick, setPick] = useState<Choice | null>(null);
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setPick(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("predictions")
      .select("prediction")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setErrorMsg(friendlyError(error.message));
        }
        setPick((data?.prediction as Choice) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, user]);

  const deadlinePassed =
    !!predictionDeadline && new Date(predictionDeadline).getTime() <= Date.now();
  const matchStarted = status !== "pending";
  const matchHasResult = !!result || status === "completed";
  const locked = deadlinePassed || matchStarted || matchHasResult;
  const correct = !!result && pick === result;
  const submitting = pendingChoice !== null || clearing;

  const submit = async (choice: Choice) => {
    setErrorMsg(null);
    if (!user) {
      toast.info("Sign in to predict");
      return;
    }
    if (locked) {
      toast.error("Predictions are locked for this match.");
      return;
    }
    if (pick === choice) return;
    setPendingChoice(choice);

    // Upsert: insert or change pick. Backend RLS still enforces deadline + not started.
    const { error } = await supabase
      .from("predictions")
      .upsert(
        { user_id: user.id, match_id: matchId, prediction: choice },
        { onConflict: "user_id,match_id" },
      );

    setPendingChoice(null);
    if (error) {
      const msg = friendlyError(error.message);
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    setPick(choice);
    toast.success(pick ? "Prediction updated!" : "Prediction locked in!");
  };

  const clearPick = async () => {
    setErrorMsg(null);
    if (!user || !pick || locked) return;
    setClearing(true);
    const { error } = await supabase
      .from("predictions")
      .delete()
      .eq("user_id", user.id)
      .eq("match_id", matchId);
    setClearing(false);
    if (error) {
      const msg = friendlyError(error.message);
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    setPick(null);
    toast.success("Prediction cleared");
  };

  const statusLabel = matchHasResult
    ? "Result available"
    : locked
      ? "Predictions closed"
      : pick
        ? "You can still change"
        : "Predictions open";

  const statusVariant = matchHasResult
    ? "default"
    : locked
      ? "secondary"
      : "outline";

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-11 rounded-md bg-muted animate-pulse" />
          <div className="h-11 rounded-md bg-muted animate-pulse" />
          <div className="h-11 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-sm text-center">
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>{" "}
        to predict and earn points.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge
          variant={statusVariant as "default" | "secondary" | "outline"}
          className="text-[10px] uppercase tracking-wider"
        >
          {statusLabel}
        </Badge>
        {matchHasResult && pick && (
          <span
            className={cn(
              "text-xs font-medium inline-flex items-center gap-1",
              correct ? "text-primary" : "text-muted-foreground",
            )}
          >
            {correct ? (
              <>
                <Trophy className="h-3 w-3" /> +10 pts
              </>
            ) : (
              "Better luck next time"
            )}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <PickButton
          label={teamAName}
          active={pick === "team_a"}
          isResult={result === "team_a"}
          loading={pendingChoice === "team_a"}
          disabled={locked || submitting}
          onClick={() => submit("team_a")}
        />
        <PickButton
          label="Draw"
          active={pick === "draw"}
          isResult={result === "draw"}
          loading={pendingChoice === "draw"}
          disabled={locked || submitting}
          onClick={() => submit("draw")}
        />
        <PickButton
          label={teamBName}
          active={pick === "team_b"}
          isResult={result === "team_b"}
          loading={pendingChoice === "team_b"}
          disabled={locked || submitting}
          onClick={() => submit("team_b")}
        />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-2 py-1.5"
        >
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 min-h-5">
          {locked && !matchHasResult && <Lock className="h-3 w-3" />}
          {matchHasResult ? (
            <>Final result is in.</>
          ) : locked ? (
            <>Closed{predictionDeadline ? ` at ${formatDeadline(predictionDeadline)}` : ""}</>
          ) : pick ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-primary" />
              Locked in{predictionDeadline ? ` · changeable until ${formatDeadline(predictionDeadline)}` : ""}
            </>
          ) : predictionDeadline ? (
            <>Closes {formatDeadline(predictionDeadline)}</>
          ) : null}
        </div>
        {pick && !locked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearPick}
            disabled={submitting}
          >
            {clearing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function formatDeadline(d: string) {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PickButton({
  label,
  active,
  isResult,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  isResult: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-11 py-2 px-2 text-xs font-medium truncate relative",
        isResult && !active && "border-primary text-primary",
        active && isResult && "ring-2 ring-primary",
      )}
      title={label}
      aria-pressed={active}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="truncate">{label}</span>
      )}
    </Button>
  );
}
