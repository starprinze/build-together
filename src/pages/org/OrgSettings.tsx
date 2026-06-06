import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

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
