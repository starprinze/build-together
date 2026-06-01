import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Row {
  event_id: string;
  user_id: string;
  username: string | null;
  total_points: number;
  correct_predictions: number;
}

interface Props {
  eventId: string;
  matchIds: string[];
  /** Compact preview shows only the top rows + a header. */
  preview?: boolean;
}

export function EventLeaderboard({ eventId, matchIds, preview = false }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [predictionCount, setPredictionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const lbPromise = supabase
        .from("event_leaderboard" as any)
        .select("*")
        .eq("event_id", eventId)
        .order("total_points", { ascending: false })
        .limit(100);

      const countPromise = matchIds.length
        ? supabase
            .from("predictions")
            .select("id", { count: "exact", head: true })
            .in("match_id", matchIds)
        : Promise.resolve({ count: 0 } as { count: number });

      const [{ data }, { count }] = await Promise.all([lbPromise, countPromise]);
      if (cancelled) return;
      setRows((data as unknown as Row[]) ?? []);
      setPredictionCount(count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, matchIds]);

  const visibleRows = preview ? rows.slice(0, 5) : rows;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <Trophy className="h-3.5 w-3.5" /> Predictors
          </div>
          <div className="mt-1 text-2xl font-display font-bold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <Target className="h-3.5 w-3.5" /> Predictions
          </div>
          <div className="mt-1 text-2xl font-display font-bold">{predictionCount}</div>
        </Card>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">Loading leaderboard…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center">
          <Trophy className="h-9 w-9 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">No points yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to predict a match in this event and top the board.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Correct</TableHead>
                <TableHead className="text-center font-display">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r, i) => {
                const isMe = user?.id === r.user_id;
                return (
                  <TableRow
                    key={r.user_id}
                    className={cn(i === 0 && "bg-accent/40", isMe && "bg-primary/5")}
                  >
                    <TableCell className="text-center font-mono tabular-nums">
                      {i < 3 ? (
                        <Medal
                          className={cn(
                            "h-4 w-4 inline",
                            i === 0 && "text-yellow-500",
                            i === 1 && "text-zinc-400",
                            i === 2 && "text-amber-700",
                          )}
                        />
                      ) : (
                        i + 1
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.username || "Player"}
                      {isMe && <span className="ml-2 text-xs text-primary font-semibold">you</span>}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums hidden sm:table-cell text-muted-foreground">
                      {r.correct_predictions}
                    </TableCell>
                    <TableCell className="text-center font-display font-bold">{r.total_points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
