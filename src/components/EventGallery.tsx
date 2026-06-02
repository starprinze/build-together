import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Upload, Trash2, X } from "lucide-react";

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
  media_type?: "image" | "video" | null;
}

const BUCKET = "event-photos";

function publicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}


// Render a thumbnail via Supabase image transformation if available; fall back to original.
function thumbUrl(path: string | null, fallback: string) {
  if (!path) return fallback;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path, {
    transform: { width: 400, height: 400, resize: "cover" },
  });
  return data.publicUrl ?? fallback;
}

async function downscaleToBlob(file: File, maxDim = 2000): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1) return file;
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85),
    );
  } catch {
    return file;
  }
}

export function EventGallery({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<PhotoRow | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("event_photos")
      .select(
        "id,event_id,url,thumbnail_url,caption,width,height,cloudinary_public_id,created_at,media_type",
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(200);
    setPhotos((data as PhotoRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`event-photos-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_photos", filter: `event_id=eq.${eventId}` },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => load(), 250);
        },
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    let ok = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const isVideo = file.type.startsWith("video/");
        const blob = isVideo ? file : await downscaleToBlob(file, 2000);
        const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
        const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: blob.type || file.type, upsert: false });
        if (upErr) throw upErr;

        // Get dimensions for nicer layout (best effort, images only)
        let width: number | null = null;
        let height: number | null = null;
        if (!isVideo) {
          try {
            const bm = await createImageBitmap(blob);
            width = bm.width;
            height = bm.height;
          } catch { /* ignore */ }
        }

        const { error: insErr } = await supabase.from("event_photos").insert({
          event_id: eventId,
          url: publicUrl(path),
          thumbnail_url: isVideo ? null : path,
          width,
          height,
          cloudinary_public_id: null,
          media_type: isVideo ? "video" : "image",
        } as any);
        if (insErr) throw insErr;
        ok++;
      } catch (err: any) {
        console.error(err);
        failed++;
      }
    }
    setUploading(false);
    if (ok) toast.success(`${ok} photo${ok === 1 ? "" : "s"} uploaded`);
    if (failed) toast.error(`${failed} upload${failed === 1 ? "" : "s"} failed`);
    if (fileInput.current) fileInput.current.value = "";
  };

  const removePhoto = async (p: PhotoRow) => {
    if (!confirm("Remove this photo?")) return;
    // Best-effort delete from storage if it lives in our bucket
    if (p.thumbnail_url && !p.thumbnail_url.startsWith("http")) {
      await supabase.storage.from(BUCKET).remove([p.thumbnail_url]);
    } else if (p.url?.includes(`/storage/v1/object/public/${BUCKET}/`)) {
      const path = p.url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
      if (path) await supabase.storage.from(BUCKET).remove([path]);
    }
    const { error } = await supabase.from("event_photos").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Photo removed");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="h-4 w-4" /> {photos.length} item{photos.length === 1 ? "" : "s"}
        </div>
        {isAdmin && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="shadow-court"
            >
              <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : "Upload media"}
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="p-12 text-center">
          <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">No media yet</h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Upload tournament photos and video highlights to share with everyone." : "Check back soon for highlights."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((p) => {
            const isVideo = p.media_type === "video";
            return (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
                <button
                  onClick={() => setLightbox(p)}
                  className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {isVideo ? (
                    <>
                      <video
                        src={p.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/20">
                        <span className="grid place-items-center h-10 w-10 rounded-full bg-background/80 backdrop-blur">
                          <span className="ml-0.5 border-y-[6px] border-y-transparent border-l-[10px] border-l-foreground" />
                        </span>
                      </span>
                    </>
                  ) : (
                    <img
                      src={thumbUrl(p.thumbnail_url, p.url)}
                      alt={p.caption ?? "Event photo"}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(p)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background border-0">
          {lightbox && (
            <div className="relative">
              {lightbox.media_type === "video" ? (
                <video
                  src={lightbox.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-auto max-h-[85vh] bg-black"
                />
              ) : (
                <img
                  src={lightbox.url}
                  alt={lightbox.caption ?? "Event photo"}
                  className="w-full h-auto max-h-[85vh] object-contain bg-black"
                />
              )}
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
