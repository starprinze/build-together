import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Row {
  user_id: string;
  username: string | null;
  total_points: number;
  correct_predictions: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("leaderboard" as any)
      .select("*")
      .order("total_points", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container py-8 sm:py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top predictors across all events.</p>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">No points yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to predict a match correctly and climb the board.
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
              {rows.map((r, i) => {
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
                      {isMe && (
                        <span className="ml-2 text-xs text-primary font-semibold">you</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums hidden sm:table-cell text-muted-foreground">
                      {r.correct_predictions}
                    </TableCell>
                    <TableCell className="text-center font-display font-bold">
                      {r.total_points}
                    </TableCell>
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
