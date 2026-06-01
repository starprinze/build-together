import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const MODULE_RELOAD_KEY = "module-load-recovered";

function reloadOnceForModuleFailure() {
  if (sessionStorage.getItem(MODULE_RELOAD_KEY)) return;
  sessionStorage.setItem(MODULE_RELOAD_KEY, "1");
  window.location.reload();
}

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
  reloadOnceForModuleFailure();
});

window.addEventListener("error", (event) => {
  const target = event.target;
  const source = target instanceof HTMLScriptElement ? target.src : "";
  const message = event.message ?? "";

  if (
    message.includes("Importing a module script failed") ||
    source.includes("/node_modules/.vite/deps/") ||
    source.includes("/assets/")
  ) {
    reloadOnceForModuleFailure();
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
    message.includes("Importing a module script failed") ||
    message.includes("Failed to fetch dynamically imported module")
  ) {
    reloadOnceForModuleFailure();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
