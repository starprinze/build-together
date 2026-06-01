import { createRoot } from "react-dom/client";
import App from "./App.tsx";
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
  if (!sessionStorage.getItem("chunk-reloaded")) {
    sessionStorage.setItem("chunk-reloaded", "1");
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
