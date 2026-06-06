import {
  LayoutDashboard, Trophy, Users, Swords, Target,
  Image as ImageIcon, Bell, Building2,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "./DashboardShell";
import { useAuth } from "@/hooks/useAuth";

const navItems: DashboardNavItem[] = [
  { to: "/organizer", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/organizer/events", label: "My Events", icon: Trophy },
  { to: "/organizer/teams", label: "Teams", icon: Users },
  { to: "/organizer/matches", label: "Matches", icon: Swords },
  { to: "/organizer/predictions", label: "Predictions", icon: Target },
  { to: "/organizer/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/organizer/notifications", label: "Notifications", icon: Bell },
  { to: "/organizer/settings", label: "Organization Settings", icon: Building2 },
];

export default function OrganizerLayout() {
  const { orgRole } = useAuth();
  const roleLabel = orgRole === "staff" ? "Staff" : "Organizer";
  return (
    <DashboardShell
      brand="Sportified"
      tagline="Tournament manager"
      brandIcon={Trophy}
      roleLabel={roleLabel}
      navItems={navItems}
    />
  );
}
