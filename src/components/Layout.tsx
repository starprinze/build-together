import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Trophy, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Layout() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
              <Trophy className="h-5 w-5" />
            </span>
            <span>Campus Sports</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              Events
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    isActive ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <ShieldCheck className="h-4 w-4" /> Admin
              </NavLink>
            )}
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            ) : (
              <Button asChild size="sm" variant="default">
                <Link to="/login">Admin login</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Built for campus tournaments · Lovable Cloud
      </footer>
    </div>
  );
}
