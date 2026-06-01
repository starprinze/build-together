import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const MODULE_RELOAD_KEY = "module-load-recovery";
const MODULE_RELOAD_COOLDOWN_MS = 15_000;
const MODULE_ERROR_PATTERNS = [
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /Loading chunk [\dA-Za-z_-]+ failed/i,
  /Loading CSS chunk [\dA-Za-z_-]+ failed/i,
  /Unable to preload CSS/i,
];

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

export function isModuleLoadError(error: unknown, source = "") {
  const message = getErrorMessage(error);
  return (
    MODULE_ERROR_PATTERNS.some((pattern) => pattern.test(message) || pattern.test(source)) ||
    source.includes("/node_modules/.vite/deps/") ||
    source.includes("/assets/")
  );
}

function cacheBustReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("_reload", `${Date.now()}`);
  window.location.replace(url.toString());
}

export function recoverFromModuleLoadError(error: unknown, source = "") {
  if (typeof window === "undefined" || !isModuleLoadError(error, source)) return false;

  const now = Date.now();
  const lastAttempt = Number(sessionStorage.getItem(MODULE_RELOAD_KEY) ?? "0");

  if (now - lastAttempt < MODULE_RELOAD_COOLDOWN_MS) return false;

  sessionStorage.setItem(MODULE_RELOAD_KEY, `${now}`);

  const cleanupTasks: Promise<unknown>[] = [];

  if ("serviceWorker" in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      ),
    );
  }

  if ("caches" in window) {
    cleanupTasks.push(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }

  void Promise.allSettled(cleanupTasks).finally(() => {
    cacheBustReload();
  });

  return true;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (recoverFromModuleLoadError(error)) {
        return new Promise<never>(() => {
          /* wait for reload */
        });
      }

      throw error;
    }
  });
}