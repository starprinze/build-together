import {
  LayoutDashboard, Building2, Trophy, Users, ShieldCheck,
  BarChart3, FileText, Bell, Settings, Crown,
  Swords, Radio, Target, Medal, Image as ImageIcon,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "./DashboardShell";

const navItems: DashboardNavItem[] = [
  { to: "/super-admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/super-admin/organizations", label: "Organizations", icon: Building2 },
  { to: "/super-admin/events", label: "Events", icon: Trophy },
  { to: "/super-admin/teams", label: "Teams", icon: Users },
  { to: "/super-admin/matches", label: "Fixtures", icon: Swords },
  { to: "/super-admin/live", label: "Live Control", icon: Radio },
  { to: "/super-admin/predictions", label: "Predictions", icon: Target },
  { to: "/super-admin/leaderboard", label: "Leaderboard", icon: Medal },
  { to: "/super-admin/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/super-admin/users", label: "Users", icon: Users },
  { to: "/super-admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
  { to: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/super-admin/reports", label: "Reports", icon: FileText },
  { to: "/super-admin/notifications", label: "Notifications", icon: Bell },
  { to: "/super-admin/settings", label: "Settings", icon: Settings },
];

export default function SuperAdminLayout() {
  return (
    <DashboardShell
      brand="Sportified"
      tagline="Platform control"
      brandIcon={Crown}
      roleLabel="Super Admin"
      navItems={navItems}
    />
  );
}
