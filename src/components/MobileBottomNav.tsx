import { Home, Trophy, Radio, Target, LogIn, User as UserIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Fixed bottom navigation visible on small screens (sm and down).
 * Hidden inside admin routes (admin already has its own tab strip).
 */
export function MobileBottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/organizer")
  ) return null;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        <NavItem to="/" end icon={Home} label="Home" />
        <NavItem to="/events" icon={Trophy} label="Events" />
        <NavItem to="/live" icon={Radio} label="Live" />
        <NavItem to="/predictions" icon={Target} label="Predict" />
        {user ? (
          <NavItem to="/profile" icon={UserIcon} label="Profile" />
        ) : (
          <NavItem to="/login" icon={LogIn} label="Sign in" />
        )}
      </div>
    </nav>
  );
}

function NavItem({
  to,
  end,
  icon: Icon,
  label,
  disabledHint,
}: {
  to: string;
  end?: boolean;
  icon: typeof Home;
  label: string;
  disabledHint?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
          disabledHint && "opacity-70",
        )
      }
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}
