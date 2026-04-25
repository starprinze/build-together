import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const EMOJIS = ["🔥", "👏", "😱", "💪", "⚽"];

function getClientId(): string {
  const KEY = "cs_reaction_client_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

interface Reaction {
  emoji: string;
  client_id: string;
}

export function MatchReactions({ matchId }: { matchId: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const clientId = getClientId();

  const load = async () => {
    const { data } = await supabase
      .from("match_reactions")
      .select("emoji,client_id")
      .eq("match_id", matchId);
    const next: Record<string, number> = {};
    const my = new Set<string>();
    (data as Reaction[] | null)?.forEach((r) => {
      next[r.emoji] = (next[r.emoji] ?? 0) + 1;
      if (r.client_id === clientId) my.add(r.emoji);
    });
    setCounts(next);
    setMine(my);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`reactions-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_reactions", filter: `match_id=eq.${matchId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const react = async (emoji: string) => {
    if (mine.has(emoji)) return;
    setMine((s) => new Set(s).add(emoji));
    setCounts((c) => ({ ...c, [emoji]: (c[emoji] ?? 0) + 1 }));
    await supabase
      .from("match_reactions")
      .insert({ match_id: matchId, emoji, client_id: clientId });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => react(e)}
          disabled={mine.has(e)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-sm transition-all hover:scale-105 active:scale-95",
            mine.has(e) && "bg-accent border-primary/40",
          )}
          aria-label={`React with ${e}`}
        >
          <span>{e}</span>
          {counts[e] ? (
            <span className="text-xs font-mono text-muted-foreground">{counts[e]}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
