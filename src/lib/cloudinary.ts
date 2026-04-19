// Cloudinary unsigned upload widget loader.
// Cloud name and unsigned upload preset are public values and safe in frontend code.

export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export const isCloudinaryConfigured = () =>
  Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

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

/** Build a thumbnail URL via Cloudinary on-the-fly transformations. */
export function cldThumb(url: string, w = 400, h = 400) {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,g_auto,w_${w},h_${h},q_auto,f_auto/`);
}

/** Build an optimized full-size URL. */
export function cldOptimized(url: string, maxW = 1600) {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_limit,w_${maxW},q_auto,f_auto/`);
}
