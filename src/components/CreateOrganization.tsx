import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Sparkles } from "lucide-react";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export default function CreateOrganization({ onCreated }: { onCreated?: () => void }) {
  const { user, refreshRole } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Enter an organization name");
      return;
    }
    setSaving(true);
    try {
      const baseSlug = slugify(name) || "org";
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("organizations").insert({
        name: name.trim(),
        slug,
        description: description.trim() || null,
        owner_id: user.id,
      });
      if (error) throw error;
      toast.success("Organization created");
      await refreshRole();
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Could not create organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container max-w-xl py-12">
      <Card className="p-8 shadow-card">
        <div className="flex items-center gap-3 mb-2">
          <span className="grid place-items-center h-11 w-11 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-bold">Create your organization</h1>
            <p className="text-sm text-muted-foreground">
              Your organization owns its own events, teams, and leaderboards.
            </p>
          </div>
        </div>

        <ol className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 my-5">
          <li className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> 1. Create org</li>
          <li>→ 2. Create event</li>
          <li>→ 3. Add teams</li>
          <li>→ 4. Generate fixtures</li>
          <li>→ 5. Start match</li>
        </ol>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              placeholder="e.g. Engineering Sports Council"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="org-desc">Description (optional)</Label>
            <Textarea
              id="org-desc"
              placeholder="What does this organization run?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full shadow-court">
            {saving ? "Creating…" : "Create organization"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
