import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";

interface Event { id: string; name: string }
interface Team { id: string; name: string; captain: string; department: string }

export default function AdminTeams() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [captain, setCaptain] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    supabase.from("events").select("id,name").order("created_at", { ascending: false }).then(({ data }) => {
      setEvents((data as Event[]) ?? []);
      if (data && data.length && !eventId) setEventId(data[0].id);
    });
  }, []);

  const loadTeams = async () => {
    if (!eventId) return setTeams([]);
    const { data } = await supabase.from("teams").select("*").eq("event_id", eventId).order("created_at");
    setTeams((data as Team[]) ?? []);
  };

  useEffect(() => { loadTeams(); }, [eventId]);

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    const { error } = await supabase.from("teams").insert({ event_id: eventId, name, captain, department });
    if (error) return toast.error(error.message);
    toast.success("Team added");
    setName(""); setCaptain(""); setDepartment("");
    loadTeams();
  };

  const removeTeam = async (id: string) => {
    if (!confirm("Remove team?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); loadTeams(); }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">Teams</h1>
      <div className="mb-6 max-w-xs">
        <Label>Event</Label>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
          <SelectContent>
            {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {eventId && (
        <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
          <Card className="p-5 h-fit">
            <h2 className="font-display font-semibold mb-4">Register team</h2>
            <form onSubmit={addTeam} className="space-y-3">
              <div>
                <Label>Team name</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Captain</Label>
                <Input required value={captain} onChange={(e) => setCaptain(e.target.value)} />
              </div>
              <div>
                <Label>Department</Label>
                <Input required value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <Button type="submit" className="w-full shadow-court"><Plus className="h-4 w-4 mr-1" /> Add team</Button>
            </form>
          </Card>

          <div>
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {teams.length} team{teams.length === 1 ? "" : "s"} registered
            </div>
            {teams.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No teams yet.</Card>
            ) : (
              <div className="grid gap-2">
                {teams.map((t) => (
                  <Card key={t.id} className="p-4 flex items-center justify-between shadow-card">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Captain: {t.captain} · {t.department}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeTeam(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
