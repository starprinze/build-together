// Cloudinary config is loaded from the public app_config table at runtime.
// Cloud name + unsigned upload preset are public values, safe to expose.

import { supabase } from "@/integrations/supabase/client";

export interface CloudinaryConfig {
  cloudName: string | null;
  uploadPreset: string | null;
}

let cached: Promise<CloudinaryConfig> | null = null;

export function clearCloudinaryConfigCache() {
  cached = null;
}

export function getCloudinaryConfig(): Promise<CloudinaryConfig> {
  if (!cached) {
    cached = (async () => {
      const { data } = await supabase
        .from("app_config")
        .select("key,value")
        .in("key", ["cloudinary_cloud_name", "cloudinary_upload_preset"]);
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      return {
        cloudName: map["cloudinary_cloud_name"] ?? null,
        uploadPreset: map["cloudinary_upload_preset"] ?? null,
      };
    })();
  }
  return cached;
}

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: { event: string; info: any }) => void,
      ) => { open: () => void; close: () => void; destroy: () => void };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadCloudinaryWidget(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.cloudinary) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cloudinary-widget="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Cloudinary widget")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://upload-widget.cloudinary.com/global/all.js";
    s.async = true;
    s.dataset.cloudinaryWidget = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Cloudinary widget"));
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export function cldThumb(url: string, w = 400, h = 400) {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,g_auto,w_${w},h_${h},q_auto,f_auto/`);
}

export function cldOptimized(url: string, maxW = 1600) {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_limit,w_${maxW},q_auto,f_auto/`);
}
