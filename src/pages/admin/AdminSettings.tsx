import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Save, ExternalLink } from "lucide-react";
import { clearCloudinaryConfigCache } from "@/lib/cloudinary";

export default function AdminSettings() {
  const [cloudName, setCloudName] = useState("");
  const [preset, setPreset] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_config")
        .select("key,value")
        .in("key", ["cloudinary_cloud_name", "cloudinary_upload_preset"]);
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      setCloudName(map["cloudinary_cloud_name"] ?? "");
      setPreset(map["cloudinary_upload_preset"] ?? "");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const cn = cloudName.trim().slice(0, 100);
    const pr = preset.trim().slice(0, 100);
    const { error } = await supabase.from("app_config").upsert(
      [
        { key: "cloudinary_cloud_name", value: cn || null, updated_at: new Date().toISOString() },
        { key: "cloudinary_upload_preset", value: pr || null, updated_at: new Date().toISOString() },
      ],
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    clearCloudinaryConfigCache();
    toast.success("Settings saved");
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display font-bold mb-6">Settings</h1>

      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <Camera className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Cloudinary (Gallery uploads)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Photo uploads are powered by Cloudinary. These two values are public and safe to store here.
        </p>

        {loading ? (
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cn">Cloud name</Label>
              <Input
                id="cn"
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                placeholder="e.g. demo"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found in your Cloudinary dashboard, top-left under your account name.
              </p>
            </div>
            <div>
              <Label htmlFor="up">Unsigned upload preset</Label>
              <Input
                id="up"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                placeholder="e.g. campus_sports_unsigned"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create one in Cloudinary → Settings → Upload → Add upload preset → set Signing Mode to{" "}
                <strong>Unsigned</strong>.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://console.cloudinary.com/settings/upload"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Open Cloudinary upload settings <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button onClick={save} disabled={saving} className="shadow-court">
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
