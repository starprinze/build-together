import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Trophy, Plus, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type FixtureFormat = "single_elim" | "double_elim" | "round_robin" | "league";

interface Event {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "ongoing" | "completed" | "archived";
  format: FixtureFormat;
}

const FORMAT_LABELS: Record<FixtureFormat, string> = {
  single_elim: "Single elimination",
  double_elim: "Double elimination",
  round_robin: "Round robin",
  league: "League (home & away)",
};

export function AdminLayout() {
  const { isSuperAdmin } = useAuth();
  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-3 overflow-x-auto">
        <AdminTab to="/admin" label="Events" />
        <AdminTab to="/admin/teams" label="Teams" />
        <AdminTab to="/admin/fixtures" label="Fixtures & Scores" />
        {isSuperAdmin && <AdminTab to="/admin/organizations" label="Organizations" />}
        {isSuperAdmin && <AdminTab to="/admin/users" label="Users" />}
        <AdminTab to="/admin/notifications" label="Notifications" />
        {isSuperAdmin && <AdminTab to="/admin/settings" label="Settings" />}
      </div>
      <Outlet />
    </div>
  );
}

function AdminTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      end
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
          isActive ? "bg-primary text-primary-foreground shadow-court" : "text-muted-foreground hover:text-foreground"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

const emptyEvent: { name: string; sport: string; start_date: string; end_date: string; status: Event["status"]; format: FixtureFormat } = { name: "", sport: "", start_date: "", end_date: "", status: "upcoming", format: "single_elim" };

export default function AdminEvents() {
  const { isSuperAdmin, managedOrgId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState(emptyEvent);

  const load = async () => {
    let query = supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false });
    // Organizers only see events that belong to their organization.
    if (!isSuperAdmin && managedOrgId) {
      query = query.eq("organization_id", managedOrgId);
    } else if (!isSuperAdmin && !managedOrgId) {
      setEvents([]);
      return;
    }
    const { data } = await query;
    setEvents((data as Event[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, managedOrgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const { error } = await supabase.from("events").update(form).eq("id", editing.id);
        if (error) throw error;
        toast.success("Event updated");
      } else {
        // Stamp the event with the organizer's organization so it stays isolated.
        const payload = managedOrgId ? { ...form, organization_id: managedOrgId } : form;
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
        toast.success("Event created");
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyEvent);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Event permanently deleted");
      load();
    }
  };

  const handleArchive = async (ev: Event) => {
    const next = ev.status === "archived" ? "completed" : "archived";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", ev.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next === "archived" ? "Event archived" : "Event restored");
      load();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyEvent);
    setOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditing(ev);
    setForm({
      name: ev.name,
      sport: ev.sport,
      start_date: ev.start_date,
      end_date: ev.end_date,
      status: ev.status,
      format: ev.format ?? "single_elim",
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Events</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="shadow-court">
              <Plus className="h-4 w-4 mr-1" /> New event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit event" : "Create event"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Sport</Label>
                <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a sport" /></SelectTrigger>
                  <SelectContent>
                    {listSportProfiles().map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.icon} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tournament format</Label>
                <Select value={form.format} onValueChange={(v: FixtureFormat) => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FORMAT_LABELS) as FixtureFormat[]).map((k) => (
                      <SelectItem key={k} value={k}>{FORMAT_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" className="shadow-court">{editing ? "Save changes" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No events yet. Create your first one.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((ev) => (
            <Card key={ev.id} className="p-4 flex items-center justify-between gap-4 shadow-card">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 className="font-display font-semibold truncate">{ev.name}</h3>
                  <Badge variant="outline" className="text-xs">{ev.status}</Badge>
                  <Badge variant="secondary" className="text-xs">{FORMAT_LABELS[ev.format ?? "single_elim"]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {ev.sport} · {new Date(ev.start_date).toLocaleDateString()} → {new Date(ev.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button asChild variant="ghost" size="sm"><Link to={`/events/${ev.id}`}>View</Link></Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(ev)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleArchive(ev)}
                  title={ev.status === "archived" ? "Restore event" : "Archive event"}
                >
                  {ev.status === "archived" ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </Button>
                {isSuperAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Delete permanently">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{ev.name}” permanently?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-2 text-left">
                            <p>Deleting this event will remove:</p>
                            <ul className="list-disc pl-5 space-y-0.5">
                              <li>matches</li>
                              <li>predictions</li>
                              <li>leaderboard records</li>
                              <li>gallery items</li>
                              <li>standings</li>
                              <li>related event data</li>
                            </ul>
                            <p className="font-medium text-destructive">This action cannot be undone.</p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(ev.id)}
                        >
                          Delete permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
