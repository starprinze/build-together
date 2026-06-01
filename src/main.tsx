import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { recoverFromModuleLoadError } from "./lib/moduleLoadRecovery";
import "./index.css";

// Service worker hygiene: never register inside iframes / preview hosts.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app"));

if (isInIframe || isPreviewHost) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
}

// Recover from stale lazy-chunk loads (e.g. after a new deploy / stale SW cache).
// Reload once instead of leaving the user on a blank screen.
window.addEventListener("vite:preloadError", () => {
  recoverFromModuleLoadError(new Error("vite:preloadError"), window.location.href);
});

window.addEventListener("error", (event) => {
  const target = event.target;
  const source = target instanceof HTMLScriptElement ? target.src : "";
  const message = event.message ?? "";

  if (
    recoverFromModuleLoadError(new Error(message), source)
  ) {
    return;
  }
}, true);

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message =
    typeof reason === "string"
      ? reason
      : typeof reason?.message === "string"
        ? reason.message
        : "";

  if (
    recoverFromModuleLoadError(reason)
  ) {
    return;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
