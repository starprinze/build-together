import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Users, Upload, Pencil, ExternalLink, ImageOff } from "lucide-react";

interface Event {
  id: string;
  name: string;
}
interface Team {
  id: string;
  name: string;
  captain: string;
  department: string;
  logo_url: string | null;
  roster: string | null;
}

export default function AdminTeams() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [captain, setCaptain] = useState("");
  const [department, setDepartment] = useState("");

  const [editing, setEditing] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [editCaptain, setEditCaptain] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editRoster, setEditRoster] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("id,name")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEvents((data as Event[]) ?? []);
        if (data && data.length && !eventId) setEventId(data[0].id);
      });
  }, []);

  const loadTeams = async () => {
    if (!eventId) return setTeams([]);
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at");
    setTeams((data as Team[]) ?? []);
  };

  useEffect(() => {
    loadTeams();
  }, [eventId]);

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    const { error } = await supabase
      .from("teams")
      .insert({ event_id: eventId, name, captain, department });
    if (error) return toast.error(error.message);
    toast.success("Team added");
    setName("");
    setCaptain("");
    setDepartment("");
    loadTeams();
  };

  const removeTeam = async (id: string) => {
    if (!confirm("Remove team?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      loadTeams();
    }
  };

  const openEdit = (t: Team) => {
    setEditing(t);
    setEditName(t.name);
    setEditCaptain(t.captain);
    setEditDepartment(t.department);
    setEditRoster(t.roster ?? "");
    setEditLogoUrl(t.logo_url ?? null);
  };

  const onLogoChange = async (file: File) => {
    if (!editing) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${editing.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("team-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      setEditLogoUrl(data.publicUrl);
      toast.success("Logo uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => setEditLogoUrl(null);

  const saveEdit = async () => {
    if (!editing) return;
    if (!editName.trim() || !editCaptain.trim() || !editDepartment.trim()) {
      toast.error("Name, captain, and department are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("teams")
      .update({
        name: editName.trim().slice(0, 100),
        captain: editCaptain.trim().slice(0, 100),
        department: editDepartment.trim().slice(0, 100),
        roster: editRoster.trim().slice(0, 4000) || null,
        logo_url: editLogoUrl,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Team updated");
    setEditing(null);
    loadTeams();
  };

  const initials = (n: string) =>
    n
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">Teams</h1>
      <div className="mb-6 max-w-xs">
        <Label>Event</Label>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger>
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
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
                <Input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Captain</Label>
                <Input
                  required
                  maxLength={100}
                  value={captain}
                  onChange={(e) => setCaptain(e.target.value)}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  required
                  maxLength={100}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full shadow-court">
                <Plus className="h-4 w-4 mr-1" /> Add team
              </Button>
              <p className="text-xs text-muted-foreground">
                Add the logo and roster after creating the team.
              </p>
            </form>
          </Card>

          <div>
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {teams.length} team
              {teams.length === 1 ? "" : "s"} registered
            </div>
            {teams.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No teams yet.</Card>
            ) : (
              <div className="grid gap-2">
                {teams.map((t) => (
                  <Card
                    key={t.id}
                    className="p-4 flex items-center gap-3 shadow-card"
                  >
                    <Avatar className="h-10 w-10">
                      {t.logo_url && <AvatarImage src={t.logo_url} alt="" />}
                      <AvatarFallback className="bg-gradient-court text-primary-foreground text-xs font-bold">
                        {initials(t.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Captain: {t.captain} · {t.department}
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      title="View public profile"
                    >
                      <Link to={`/teams/${t.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeTeam(t.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit team</DialogTitle>
            <DialogDescription>
              Update details, upload a logo, and manage the roster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-border">
                {editLogoUrl && <AvatarImage src={editLogoUrl} alt="" />}
                <AvatarFallback className="bg-gradient-court text-primary-foreground font-bold">
                  {initials(editName || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onLogoChange(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? "Uploading…" : editLogoUrl ? "Replace" : "Upload logo"}
                </Button>
                {editLogoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeLogo}>
                    <ImageOff className="h-4 w-4 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Team name</Label>
                <Input maxLength={100} value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  maxLength={100}
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Captain</Label>
              <Input
                maxLength={100}
                value={editCaptain}
                onChange={(e) => setEditCaptain(e.target.value)}
              />
            </div>
            <div>
              <Label>Roster (one player per line)</Label>
              <Textarea
                rows={6}
                maxLength={4000}
                placeholder={"#7 Jordan Lee\n#10 Sam Patel\n…"}
                value={editRoster}
                onChange={(e) => setEditRoster(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editRoster.split(/\r?\n/).filter((s) => s.trim()).length} player
                {editRoster.split(/\r?\n/).filter((s) => s.trim()).length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving} className="shadow-court">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
