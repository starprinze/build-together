import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Upload, Trash2, X, AlertCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import {
  cldOptimized,
  cldThumb,
  getCloudinaryConfig,
  loadCloudinaryWidget,
  type CloudinaryConfig,
} from "@/lib/cloudinary";

interface PhotoRow {
  id: string;
  event_id: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  cloudinary_public_id: string | null;
  created_at: string;
}

export function EventGallery({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [lightbox, setLightbox] = useState<PhotoRow | null>(null);
  const [config, setConfig] = useState<CloudinaryConfig | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("event_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setPhotos((data as PhotoRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    getCloudinaryConfig().then(setConfig);
    const channel = supabase
      .channel(`event-photos-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_photos", filter: `event_id=eq.${eventId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const cloudinaryReady = !!(config?.cloudName && config?.uploadPreset);

  const openUploader = async () => {
    if (!cloudinaryReady) {
      toast.error("Cloudinary is not configured. Add your cloud name & upload preset in admin settings.");
      return;
    }
    setOpening(true);
    try {
      await loadCloudinaryWidget();
      const widget = window.cloudinary!.createUploadWidget(
        {
          cloudName: config!.cloudName!,
          uploadPreset: config!.uploadPreset!,
          sources: ["local", "camera", "url"],
          multiple: true,
          maxFiles: 20,
          clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "gif", "heic"],
          maxImageFileSize: 10_000_000,
          folder: `events/${eventId}`,
          tags: [`event:${eventId}`],
        },
        async (error, result) => {
          if (error) {
            toast.error("Upload failed");
            return;
          }
          if (result?.event === "success") {
            const info = result.info;
            const { error: insertErr } = await supabase.from("event_photos").insert({
              event_id: eventId,
              url: info.secure_url,
              thumbnail_url: info.thumbnail_url ?? null,
              caption: null,
              width: info.width ?? null,
              height: info.height ?? null,
              cloudinary_public_id: info.public_id ?? null,
            });
            if (insertErr) toast.error(insertErr.message);
            else toast.success("Photo added");
          }
        },
      );
      widget.open();
    } catch {
      toast.error("Could not open uploader");
    } finally {
      setOpening(false);
    }
  };

  const removePhoto = async (p: PhotoRow) => {
    if (!confirm("Remove this photo?")) return;
    const { error } = await supabase.from("event_photos").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Photo removed");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="h-4 w-4" /> {photos.length} photo{photos.length === 1 ? "" : "s"}
        </div>
        {isAdmin && (
          <Button onClick={openUploader} disabled={opening} className="shadow-court">
            <Upload className="h-4 w-4 mr-1" /> {opening ? "Opening…" : "Upload photos"}
          </Button>
        )}
      </div>

      {isAdmin && config && !cloudinaryReady && (
        <Card className="p-4 mb-4 border-destructive/40 bg-destructive/5 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <div className="font-medium text-foreground">Cloudinary not configured</div>
            <p className="text-muted-foreground mt-1">
              Add your Cloudinary cloud name and unsigned upload preset to enable photo uploads.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/admin/settings">
                <Settings className="h-4 w-4 mr-1" /> Open settings
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="p-12 text-center">
          <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">No photos yet</h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Upload tournament photos to share with everyone." : "Check back soon for highlights."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
              <button
                onClick={() => setLightbox(p)}
                className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <img
                  src={p.thumbnail_url ?? cldThumb(p.url)}
                  alt={p.caption ?? "Event photo"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
              {isAdmin && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(p)}
                  title="Delete photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background border-0">
          {lightbox && (
            <div className="relative">
              <img
                src={cldOptimized(lightbox.url)}
                alt={lightbox.caption ?? "Event photo"}
                className="w-full h-auto max-h-[85vh] object-contain bg-black"
              />
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 grid place-items-center h-9 w-9 rounded-full bg-background/80 hover:bg-background backdrop-blur"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {lightbox.caption && (
                <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border">
                  {lightbox.caption}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
