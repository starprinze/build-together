import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Building2, Users, Eye, ArrowRight } from "lucide-react";

const roles = [
  {
    name: "Super Admin",
    icon: Crown,
    badge: "Platform owner",
    can: ["Govern all organizations", "Manage any event", "Assign roles & organizations", "View platform analytics & settings"],
  },
  {
    name: "Organizer Admin",
    icon: Building2,
    badge: "Organization owner",
    can: ["Manage their organization", "Create & run their events", "Manage their teams & matches", "Upload media & notify fans"],
  },
  {
    name: "Staff",
    icon: Users,
    badge: "Event operator",
    can: ["Operate their organization's events", "Update live scores & matches", "Manage teams & galleries"],
    cannot: ["Edit organization settings", "Access platform governance"],
  },
  {
    name: "Viewer",
    icon: Eye,
    badge: "Fan",
    can: ["Follow events & live scores", "Make predictions", "Join leaderboards", "Browse galleries"],
  },
];

export default function RolesPermissions() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">The Sportified role hierarchy and what each role can do.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/super-admin/users">Assign roles <ArrowRight className="h-4 w-4 ml-1" /></Link>
        </Button>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {roles.map((r) => (
          <Card key={r.name} className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center h-10 w-10 rounded-lg bg-accent text-primary">
                <r.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display font-semibold leading-tight">{r.name}</h2>
                <Badge variant="secondary" className="mt-0.5">{r.badge}</Badge>
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {r.can.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
              {r.cannot?.map((c) => (
                <li key={c} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  <span>Cannot: {c}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
