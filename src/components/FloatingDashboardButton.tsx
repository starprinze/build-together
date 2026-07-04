import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Floating shortcut to the control center.
 *
 * Visibility follows the permission chain Viewer → Staff → Organizer → Super Admin:
 * only users who can manage something (staff, organizer admins, super admins) see it.
 * Plain viewers never see it. It routes each user to the correct dashboard and is
 * offset above the mobile bottom navigation so the two never overlap.
 */
export function FloatingDashboardButton() {
  const { canManage, isSuperAdmin, loading } = useAuth();
  const { pathname } = useLocation();

  // Hidden for viewers / signed-out users.
  if (loading || !canManage) return null;

  // Already inside a management shell — no need for the shortcut.
  if (
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/organizer") ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  const target = isSuperAdmin ? "/super-admin" : "/organizer";
  const label = isSuperAdmin ? "Super Admin dashboard" : "Organizer dashboard";

  return (
    <Link
      to={target}
      aria-label={label}
      title={label}
      className={cn(
        "fixed right-4 z-50 inline-flex items-center gap-2 rounded-full",
        "bg-gradient-court text-primary-foreground shadow-court",
        "px-4 py-3 text-sm font-semibold transition-transform hover:scale-105 active:scale-95",
        // Sit above the mobile bottom nav on small screens; normal offset on desktop.
        "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6",
      )}
    >
      <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">Dashboard</span>
    </Link>
  );
}
