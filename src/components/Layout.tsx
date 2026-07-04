import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Trophy, LogOut, Award, User as UserIcon, Sun, Moon, Shield, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingDashboardButton } from "@/components/FloatingDashboardButton";

export default function Layout() {
  const { user, isSuperAdmin, canManage, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/events", label: "Events" },
    { to: "/live", label: "Live" },
    { to: "/predictions", label: "Predictions" },
  ];

  const authRedirect = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="container flex items-center justify-between gap-3 h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
              <Trophy className="h-5 w-5" />
            </span>
            <span>Sportified</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {publicLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {label === "Leaderboard" ? <Award className="h-4 w-4" /> : null}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                  <Link to={`/login?redirect=${authRedirect}`}>Sign in</Link>
                </Button>
                <Button asChild size="sm" variant="default">
                  <Link to={`/login?mode=signup&redirect=${authRedirect}`}>Create account</Link>
                </Button>
              </>
            )}
            {user && (
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/profile" className="gap-1.5 inline-flex items-center">
                  <UserIcon className="h-4 w-4" /> Profile
                </Link>
              </Button>
            )}
            {user && canManage && !isSuperAdmin && (
              <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex text-muted-foreground hover:text-foreground" title="Organizer dashboard">
                <Link to="/organizer">
                  <Building2 className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {isSuperAdmin && (
              <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex text-muted-foreground hover:text-foreground" title="Platform control">
                <Link to="/super-admin">
                  <Shield className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="md:hidden border-t border-border/60">
          <div className="container flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
            {publicLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground space-y-1">
        <div>Tournament management for every community · Lovable Cloud</div>
        <div>
          <Link to="/admin/login" className="hover:text-foreground transition-colors">
            Organizer login
          </Link>
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
