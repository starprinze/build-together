import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  eventCount?: number;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("id,name,slug,description,created_at")
      .order("created_at", { ascending: false });
    const list = (data as Org[]) ?? [];

    const { data: events } = await supabase.from("events").select("organization_id");
    const tally: Record<string, number> = {};
    (events ?? []).forEach((e: any) => {
      if (e.organization_id) tally[e.organization_id] = (tally[e.organization_id] ?? 0) + 1;
    });
    setOrgs(list.map((o) => ({ ...o, eventCount: tally[o.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => { setEditing(null); setName(""); setDescription(""); setOpen(true); };
  const openEdit = (o: Org) => { setEditing(o); setName(o.name); setDescription(o.description ?? ""); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter a name");
    try {
      if (editing) {
        const { error } = await supabase
          .from("organizations")
          .update({ name: name.trim(), description: description.trim() || null })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Organization updated");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const slug = `${slugify(name) || "org"}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase
          .from("organizations")
          .insert({ name: name.trim(), description: description.trim() || null, slug, owner_id: user?.id });
        if (error) throw error;
        toast.success("Organization created");
      }
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const remove = async (o: Org) => {
    if (!confirm(`Delete "${o.name}"? Its events will be detached.`)) return;
    const { error } = await supabase.from("organizations").delete().eq("id", o.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground">Govern every organization on the platform.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="shadow-court"><Plus className="h-4 w-4 mr-1" /> New organization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit organization" : "Create organization"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <DialogFooter>
                <Button type="submit" className="shadow-court">{editing ? "Save changes" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
      ) : orgs.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No organizations yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orgs.map((o) => (
            <Card key={o.id} className="p-4 flex items-center justify-between gap-4 shadow-card">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 className="font-display font-semibold truncate">{o.name}</h3>
                  <Badge variant="outline" className="text-xs">{o.eventCount} events</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{o.description ?? o.slug}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(o)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
