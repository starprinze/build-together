import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import type { StandingRow } from "@/lib/standings";
import { DEFAULT_SPORT_PROFILE, type SportProfile } from "@/lib/sports";
import { cn } from "@/lib/utils";

export function StandingsTable({
  rows,
  profile = DEFAULT_SPORT_PROFILE,
}: {
  rows: StandingRow[];
  profile?: SportProfile;
}) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-display font-semibold mb-1">No standings yet</h3>
        <p className="text-sm text-muted-foreground">Standings appear once matches are played.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10 text-center">#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">P</TableHead>
            <TableHead className="text-center">W</TableHead>
            {profile.allowsDraw && <TableHead className="text-center">D</TableHead>}
            <TableHead className="text-center">L</TableHead>
            <TableHead className="text-center hidden sm:table-cell">PF</TableHead>
            <TableHead className="text-center hidden sm:table-cell">PA</TableHead>
            <TableHead className="text-center">+/-</TableHead>
            <TableHead className="text-center font-display">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.teamId} className={cn(i === 0 && "bg-accent/40")}>
              <TableCell className="text-center font-mono tabular-nums text-xs text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <Link to={`/teams/${r.teamId}`} className="font-medium hover:text-primary hover:underline">
                  {r.name}
                </Link>
                {r.department && (
                  <div className="text-xs text-muted-foreground">{r.department}</div>
                )}
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums">{r.played}</TableCell>
              <TableCell className="text-center font-mono tabular-nums text-primary font-semibold">
                {r.wins}
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                {r.losses}
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums hidden sm:table-cell">
                {r.pointsFor}
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums hidden sm:table-cell">
                {r.pointsAgainst}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center font-mono tabular-nums",
                  r.diff > 0 && "text-primary",
                  r.diff < 0 && "text-destructive",
                )}
              >
                {r.diff > 0 ? `+${r.diff}` : r.diff}
              </TableCell>
              <TableCell className="text-center font-display font-bold">{r.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/20">
        Win = 3 pts · Loss = 0 pts · Sorted by Points, then point differential.
      </div>
    </Card>
  );
}
