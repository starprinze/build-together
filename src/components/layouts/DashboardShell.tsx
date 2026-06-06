import { useState, type ComponentType } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, LogOut, Sun, Moon, ExternalLink, type LucideProps } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: ComponentType<LucideProps>;
  end?: boolean;
}

interface DashboardShellProps {
  /** Product name shown in the sidebar header. */
  brand: string;
  /** Short descriptor under the brand (e.g. "Platform control"). */
  tagline: string;
  /** Logo icon. */
  brandIcon: ComponentType<LucideProps>;
  /** Role label rendered as a badge. */
  roleLabel: string;
  navItems: DashboardNavItem[];
}

/**
 * Reusable shell for the role-specific management experiences (super admin,
 * organizer). Provides an independent sidebar + top bar, fully separate from
 * the public viewer navigation. Mobile-first: the sidebar collapses into a
 * slide-over sheet on small screens.
 */
export default function DashboardShell({
  brand,
  tagline,
  brandIcon: BrandIcon,
  roleLabel,
  navItems,
}: DashboardShellProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col">
      <Link
        to={navItems[0]?.to ?? "/"}
        onClick={onNavigate}
        className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0"
      >
        <span className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
          <BrandIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-display font-bold leading-tight truncate">{brand}</span>
          <span className="block text-[11px] text-muted-foreground leading-tight truncate">{tagline}</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-court"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground">
          <Link to="/" onClick={onNavigate}>
            <ExternalLink className="h-4 w-4" /> View public site
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => {
            onNavigate?.();
            handleSignOut();
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <SidebarBody />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 h-16 px-4 border-b border-border bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarBody onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Badge variant="secondary" className="font-medium">{roleLabel}</Badge>
            {user?.email && (
              <span className="hidden sm:inline text-sm text-muted-foreground truncate">{user.email}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
