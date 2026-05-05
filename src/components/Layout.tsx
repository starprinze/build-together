import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Trophy, LogOut, ShieldCheck, Download, Award, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function Layout() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDownloadHtml = () => {
    // Clone the live document so we can strip interactive-only nodes safely.
    const docClone = document.documentElement.cloneNode(true) as HTMLElement;

    // Remove script tags — rendered HTML snapshot shouldn't re-execute the app.
    docClone.querySelectorAll("script").forEach((s) => s.remove());

    // Inline computed stylesheet links by leaving <link rel="stylesheet"> as-is
    // (they reference absolute URLs once we set <base>). Inject a <base> so
    // relative asset URLs still resolve when the file is opened standalone.
    const head = docClone.querySelector("head");
    if (head && !head.querySelector("base")) {
      const base = document.createElement("base");
      base.href = window.location.origin + "/";
      head.prepend(base);
    }

    const html = "<!DOCTYPE html>\n" + docClone.outerHTML;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug =
      (document.title || "page")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "page";
    a.href = url;
    a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  isActive ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Award className="h-4 w-4" /> <span className="hidden sm:inline">Leaderboard</span>
            </NavLink>
            {user && !isAdmin && (
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    isActive ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <UserIcon className="h-4 w-4" /> <span className="hidden sm:inline">Profile</span>
              </NavLink>
            )}
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
            {isAdmin && <NotificationBell />}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadHtml}
              className="gap-1.5"
              title="Download current page as HTML"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">HTML</span>
            </Button>
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
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Built for campus tournaments · Lovable Cloud
      </footer>
      <MobileBottomNav />
    </div>
  );
}
