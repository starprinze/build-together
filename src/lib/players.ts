import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Phase 5 — Players / Squads
// A lightweight, sport-agnostic squad list per team. Stats are computed from
// matches elsewhere; this module just manages the roster records.
// ============================================================================

export interface PlayerRow {
  id: string;
  team_id: string;
  event_id: string;
  name: string;
  jersey_number: number | null;
  position: string | null;
  photo_url: string | null;
  is_captain: boolean;
}

export interface PlayerInput {
  name: string;
  jersey_number?: number | null;
  position?: string | null;
  photo_url?: string | null;
  is_captain?: boolean;
}

export async function listPlayers(teamId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id,team_id,event_id,name,jersey_number,position,photo_url,is_captain")
    .eq("team_id", teamId)
    .order("jersey_number", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as PlayerRow[]) ?? [];
}

export async function addPlayer(teamId: string, eventId: string, input: PlayerInput) {
  const { error } = await supabase.from("players").insert({
    team_id: teamId,
    event_id: eventId,
    name: input.name.trim(),
    jersey_number: input.jersey_number ?? null,
    position: input.position ?? null,
    photo_url: input.photo_url ?? null,
    is_captain: input.is_captain ?? false,
  });
  if (error) throw error;
}

export async function updatePlayer(playerId: string, patch: Partial<PlayerInput>) {
  const { error } = await supabase.from("players").update(patch).eq("id", playerId);
  if (error) throw error;
}

export async function deletePlayer(playerId: string) {
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
}
