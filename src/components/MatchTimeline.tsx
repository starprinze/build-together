import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  body: string;
  minute: number | null;
  event_type: string;
  created_at: string;
}

export function MatchTimeline({
  matchId,
  isAdmin = false,
}: {
  matchId: string;
  isAdmin?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [body, setBody] = useState("");
  const [minute, setMinute] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    setItems((data as Item[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`match-events-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("match_events").insert({
      match_id: matchId,
      body: body.trim(),
      minute: minute ? Number(minute) : null,
      event_type: "comment",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
    setMinute("");
  };

  const remove = async (id: string) => {
    await supabase.from("match_events").delete().eq("id", id);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No commentary yet.</p>
      ) : (
        <ol className="space-y-2 border-l border-border pl-4">
          {items.map((it) => (
            <li key={it.id} className="relative">
              <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  {it.minute != null && (
                    <span className="font-mono text-xs text-primary mr-1.5">{it.minute}'</span>
                  )}
                  {it.body}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => remove(it.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(it.created_at).toLocaleTimeString()}
              </div>
            </li>
          ))}
        </ol>
      )}

      {isAdmin && (
        <form onSubmit={add} className="flex items-end gap-2 pt-2 border-t border-border">
          <div className="w-16">
            <Input
              type="number"
              placeholder="min"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="h-9"
            />
          </div>
          <Input
            placeholder="Add commentary…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={busy}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      )}
    </div>
  );
}
