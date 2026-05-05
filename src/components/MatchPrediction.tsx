import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, Trophy } from "lucide-react";

type Choice = "team_a" | "team_b" | "draw";

interface Props {
  matchId: string;
  teamAName: string;
  teamBName: string;
  predictionDeadline: string | null;
  result: Choice | null;
  status: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("predictions")
      .select("prediction")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setPick((data?.prediction as Choice) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, user]);

  const deadlinePassed =
    !!predictionDeadline && new Date(predictionDeadline).getTime() <= Date.now();
  const matchHasResult = !!result || status === "completed";
  const locked = deadlinePassed || matchHasResult;
  const correct = !!result && pick === result;

  const submit = async (choice: Choice) => {
    if (!user) {
      toast.info("Sign in to predict");
      return;
    }
    if (locked || pick) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("predictions")
      .insert({ user_id: user.id, match_id: matchId, prediction: choice });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Could not submit prediction");
      return;
    }
    setPick(choice);
    toast.success("Prediction locked in!");
  };

  const statusLabel = matchHasResult
    ? "Result available"
    : locked
      ? "Predictions closed"
      : "Predictions open";

  const statusVariant = matchHasResult
    ? "default"
    : locked
      ? "secondary"
      : "outline";

  if (loading) {
    return <div className="h-20 rounded-md bg-muted animate-pulse" />;
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
      <div className="flex items-center justify-between">
        <Badge variant={statusVariant as any} className="text-[10px] uppercase tracking-wider">
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
          disabled={locked || !!pick || submitting}
          onClick={() => submit("team_a")}
        />
        <PickButton
          label="Draw"
          active={pick === "draw"}
          isResult={result === "draw"}
          disabled={locked || !!pick || submitting}
          onClick={() => submit("draw")}
        />
        <PickButton
          label={teamBName}
          active={pick === "team_b"}
          isResult={result === "team_b"}
          disabled={locked || !!pick || submitting}
          onClick={() => submit("team_b")}
        />
      </div>

      {predictionDeadline && !matchHasResult && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          {locked ? <Lock className="h-3 w-3" /> : null}
          {locked ? "Closed" : "Closes"}{" "}
          {new Date(predictionDeadline).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      )}
      {pick && !matchHasResult && (
        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-primary" />
          Your pick is locked in.
        </div>
      )}
    </div>
  );
}

function PickButton({
  label,
  active,
  isResult,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  isResult: boolean;
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
        "h-auto py-2 px-2 text-xs font-medium truncate",
        isResult && !active && "border-primary text-primary",
        active && isResult && "ring-2 ring-primary",
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </Button>
  );
}
