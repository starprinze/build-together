import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import { listGroups, type GroupRow } from "@/lib/groups";
import { computeStandings } from "@/lib/standings";
import type { MatchRow } from "@/components/BracketView";
import { getSportProfile } from "@/lib/sports";

type QualState = "qualified" | "maybe" | "out";

/**
 * Group Stage panel: one compact standings card per group with live
 * qualification colouring. Only group-stage matches feed these standings —
 * knockout fixtures are handled separately by the bracket.
 */
export function GroupStagePanel({
  eventId,
  matches,
  sport,
}: {
  eventId: string;
  matches: MatchRow[];
  sport: string;
}) {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const profile = useMemo(() => getSportProfile(sport), [sport]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await listGroups(eventId);
        if (!cancelled) setGroups(g);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-56 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="p-8 text-center rounded-xl">
        <Layers className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-display font-semibold mb-1">No group stage</h3>
        <p className="text-sm text-muted-foreground">
          This tournament goes straight to the knockout bracket.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const groupMatches = matches.filter((m) => m.group_id === g.id);
        const rows = computeStandings(groupMatches, profile);
        const anyPlayed = rows.some((r) => r.played > 0);
        return (
          <Card key={g.id} className="overflow-hidden rounded-xl shadow-card">
            <div className="px-4 py-3 bg-gradient-court text-primary-foreground">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider">
                {g.name}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <th className="text-left font-medium py-2 pl-4 pr-2 w-6">#</th>
                    <th className="text-left font-medium py-2 pr-2">Team</th>
                    <th className="text-center font-medium py-2 px-1.5">MP</th>
                    <th className="text-center font-medium py-2 px-1.5">W</th>
                    {profile.allowsDraw && (
                      <th className="text-center font-medium py-2 px-1.5">D</th>
                    )}
                    <th className="text-center font-medium py-2 px-1.5">L</th>
                    <th className="text-center font-medium py-2 px-1.5 hidden sm:table-cell">
                      GD
                    </th>
                    <th className="text-center font-medium py-2 px-1.5 pr-4">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const state: QualState = !anyPlayed
                      ? "maybe"
                      : i < g.qualify_count
                        ? "qualified"
                        : i < g.qualify_count + 1
                          ? "maybe"
                          : "out";
                    return (
                      <tr
                        key={r.teamId}
                        className={cn(
                          "border-t border-border/50",
                          state === "qualified" && "bg-primary/[0.06]",
                        )}
                      >
                        <td className="py-2.5 pl-4 pr-2">
                          <span
                            className={cn(
                              "inline-block h-2 w-2 rounded-full",
                              state === "qualified" && "bg-primary",
                              state === "maybe" && "bg-amber-500",
                              state === "out" && "bg-muted-foreground/40",
                            )}
                          />
                        </td>
                        <td className="py-2.5 pr-2 min-w-0">
                          <Link
                            to={`/teams/${r.teamId}`}
                            className="font-medium hover:text-primary hover:underline truncate block max-w-[9rem]"
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="text-center py-2.5 px-1.5 font-mono tabular-nums text-muted-foreground">
                          {r.played}
                        </td>
                        <td className="text-center py-2.5 px-1.5 font-mono tabular-nums text-primary font-semibold">
                          {r.wins}
                        </td>
                        {profile.allowsDraw && (
                          <td className="text-center py-2.5 px-1.5 font-mono tabular-nums text-muted-foreground">
                            {r.draws}
                          </td>
                        )}
                        <td className="text-center py-2.5 px-1.5 font-mono tabular-nums text-muted-foreground">
                          {r.losses}
                        </td>
                        <td
                          className={cn(
                            "text-center py-2.5 px-1.5 font-mono tabular-nums hidden sm:table-cell",
                            r.diff > 0 && "text-primary",
                            r.diff < 0 && "text-destructive",
                          )}
                        >
                          {r.diff > 0 ? `+${r.diff}` : r.diff}
                        </td>
                        <td className="text-center py-2.5 px-1.5 pr-4 font-display font-bold">
                          {r.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border/50 bg-muted/20">
              Top {g.qualify_count} advance to the knockout stage
            </div>
          </Card>
        );
      })}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Qualified
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Possible qualification
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Eliminated
        </span>
      </div>
    </div>
  );
}
