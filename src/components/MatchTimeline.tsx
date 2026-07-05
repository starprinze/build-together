import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getSportProfile, type MatchEventType } from "@/lib/sports";

interface Item {
  id: string;
  body: string;
  minute: number | null;
  event_type: string;
  created_at: string;
}

/** Human labels + emoji for every sport event type. */
const EVENT_META: Record<MatchEventType, { label: string; icon: string }> = {
  goal: { label: "Goal", icon: "⚽" },
  point: { label: "Point", icon: "🎯" },
  set: { label: "Set", icon: "🎽" },
  quarter: { label: "Quarter", icon: "⏱️" },
  period: { label: "Period", icon: "⏱️" },
  card: { label: "Card", icon: "🟨" },
  foul: { label: "Foul", icon: "🚫" },
  timeout: { label: "Timeout", icon: "⏳" },
  substitution: { label: "Substitution", icon: "🔁" },
  possession: { label: "Possession", icon: "🔵" },
  penalty: { label: "Penalty", icon: "🥅" },
  ace: { label: "Ace", icon: "💥" },
  note: { label: "Note", icon: "📝" },
};

function metaFor(type: string) {
  return EVENT_META[type as MatchEventType] ?? { label: type, icon: "•" };
}

export function MatchTimeline({
  matchId,
  isAdmin = false,
  sport,
}: {
  matchId: string;
  isAdmin?: boolean;
  /** Free-text sport value from the event; drives the available entry types. */
  sport?: string | null;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [body, setBody] = useState("");
  const [minute, setMinute] = useState("");
  const [eventType, setEventType] = useState<string>("note");
  const [busy, setBusy] = useState(false);

  // Sport-adaptive entry types (goals/sets/cards/…) read from the SportProfile.
  const eventTypes = useMemo<MatchEventType[]>(() => {
    const profile = getSportProfile(sport);
    return profile.eventTypes.length ? profile.eventTypes : ["note"];
  }, [sport]);

  useEffect(() => {
    // Keep the selected type valid when the sport changes.
    if (!eventTypes.includes(eventType as MatchEventType)) {
      setEventType(eventTypes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypes]);

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
    const meta = metaFor(eventType);
    const text = body.trim() || meta.label;
    setBusy(true);
    const { error } = await supabase.from("match_events").insert({
      match_id: matchId,
      body: text,
      minute: minute ? Number(minute) : null,
      event_type: eventType,
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
          {items.map((it) => {
            const meta = metaFor(it.event_type);
            return (
              <li key={it.id} className="relative">
                <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">
                    {it.minute != null && (
                      <span className="font-mono text-xs text-primary mr-1.5">{it.minute}'</span>
                    )}
                    {it.event_type && it.event_type !== "note" && (
                      <span className="mr-1" title={meta.label}>{meta.icon}</span>
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
            );
          })}
        </ol>
      )}

      {isAdmin && (
        <form onSubmit={add} className="flex items-end gap-2 pt-2 border-t border-border flex-wrap">
          <div className="w-[130px]">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((t) => {
                  const meta = metaFor(t);
                  return (
                    <SelectItem key={t} value={t}>
                      <span className="mr-1">{meta.icon}</span>
                      {meta.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
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
            placeholder="Detail (optional)…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="h-9 flex-1 min-w-[120px]"
          />
          <Button type="submit" size="sm" disabled={busy}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      )}
    </div>
  );
}
