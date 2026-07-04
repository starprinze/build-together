import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import {
  listPlayers,
  addPlayer,
  deletePlayer,
  updatePlayer,
  type PlayerRow,
} from "@/lib/players";

/**
 * Phase 5 — squad list for a team. Read-only for the public; editable when
 * `canManage` is true (organizer/admin of the event).
 */
export function TeamSquad({
  teamId,
  eventId,
  canManage = false,
}: {
  teamId: string;
  eventId: string;
  canManage?: boolean;
}) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [position, setPosition] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setPlayers(await listPlayers(teamId));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addPlayer(teamId, eventId, {
        name,
        jersey_number: jersey ? Number(jersey) : null,
        position: position.trim() || null,
      });
      setName("");
      setJersey("");
      setPosition("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deletePlayer(id);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const toggleCaptain = async (p: PlayerRow) => {
    try {
      await updatePlayer(p.id, { is_captain: !p.is_captain });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const initials = (n: string) =>
    n.split(/\s+/).map((x) => x[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold">Squad</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {players.length} {players.length === 1 ? "player" : "players"}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players added yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {players.map((p) => (
            <li key={p.id} className="py-2 flex items-center gap-3 text-sm">
              <Avatar className="h-8 w-8">
                {p.photo_url && <AvatarImage src={p.photo_url} alt={p.name} />}
                <AvatarFallback className="text-[10px]">{initials(p.name)}</AvatarFallback>
              </Avatar>
              {p.jersey_number != null && (
                <span className="w-6 text-xs font-mono text-muted-foreground tabular-nums">
                  #{p.jersey_number}
                </span>
              )}
              <span className="flex-1 min-w-0 truncate">
                {p.name}
                {p.is_captain && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    <Star className="h-3 w-3 mr-0.5" /> C
                  </Badge>
                )}
              </span>
              {p.position && (
                <span className="text-xs text-muted-foreground">{p.position}</span>
              )}
              {canManage && (
                <>
                  <button
                    onClick={() => toggleCaptain(p)}
                    className="text-muted-foreground hover:text-primary shrink-0"
                    aria-label="Toggle captain"
                  >
                    <Star className={`h-3.5 w-3.5 ${p.is_captain ? "fill-primary text-primary" : ""}`} />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Remove player"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2 pt-4 mt-2 border-t border-border">
          <Input
            placeholder="Player name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 flex-1 min-w-[8rem]"
          />
          <Input
            type="number"
            placeholder="#"
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
            className="h-9 w-16"
          />
          <Input
            placeholder="Position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="h-9 w-28"
          />
          <Button type="submit" size="sm" disabled={busy}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </form>
      )}
    </Card>
  );
}
