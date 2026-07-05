import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Users, Trash2 } from "lucide-react";

const ORG_ROLES = ["organizer", "staff", "referee", "media", "volunteer", "viewer"] as const;
type OrgMemberRole = (typeof ORG_ROLES)[number];

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  username: string | null;
}

function MembersPanel({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: mem } = await supabase
      .from("organization_members")
      .select("id,user_id,role")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    const rows = (mem as any[]) ?? [];
    const ids = rows.map((m) => m.user_id);
    let names: Record<string, string | null> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,username").in("user_id", ids);
      (profs as any[] ?? []).forEach((p) => { names[p.user_id] = p.username; });
    }
    setMembers(rows.map((m) => ({ ...m, username: names[m.user_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { if (orgId) load(); /* eslint-disable-next-line */ }, [orgId]);

  const changeRole = async (id: string, role: OrgMemberRole) => {
    const { error } = await supabase.from("organization_members").update({ role }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("organization_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    load();
  };

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold">Team members</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Assign roles — organizers manage everything, staff enter scores, referees, media and volunteers get scoped access.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No members yet. Add them from Role &amp; Access Management.</p>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2 flex-wrap">
              <span className="text-sm flex-1 min-w-[120px] truncate">
                {m.username ?? m.user_id.slice(0, 8)}
              </span>
              {canManage ? (
                <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as OrgMemberRole)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORG_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="capitalize">{m.role}</Badge>
              )}
              {canManage && (
                <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}


export default function OrgSettings() {
  const { managedOrgId, orgRole, refreshRole } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = orgRole === "owner";

  useEffect(() => {
    const load = async () => {
      if (!managedOrgId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("organizations")
        .select("name,description,slug")
        .eq("id", managedOrgId)
        .maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setSlug(data.slug ?? "");
      }
      setLoading(false);
    };
    void load();
  }, [managedOrgId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedOrgId) return;
    if (!name.trim()) return toast.error("Enter a name");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", managedOrgId);
      if (error) throw error;
      toast.success("Organization updated");
      await refreshRole();
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>;

  if (!managedOrgId) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        You don't manage an organization yet.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center gap-3">
        <span className="grid place-items-center h-10 w-10 rounded-lg bg-accent text-primary">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-display font-bold">Organization Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your organization profile.</p>
        </div>
      </header>

      <Card className="p-6">
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label>Handle</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">/{slug}</Badge>
              <span className="text-xs text-muted-foreground">Permanent identifier</span>
            </div>
          </div>
          <div>
            <Label htmlFor="org-desc">Description</Label>
            <Textarea
              id="org-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={!canEdit}
              placeholder="What does your organization run?"
            />
          </div>
          {canEdit ? (
            <Button type="submit" className="shadow-court" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Only the organization owner can edit these settings.</p>
          )}
        </form>
      </Card>
    </div>
  );
}
