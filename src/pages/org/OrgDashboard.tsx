import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CreateOrganization from "@/components/CreateOrganization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, CalendarPlus, Users, Swords, Sparkles, Trophy, Image as ImageIcon, ArrowRight,
} from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function OrgDashboard() {
  const { managedOrgId, isSuperAdmin, orgRole, loading } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [counts, setCounts] = useState({ events: 0, teams: 0, live: 0, photos: 0 });
  const [busy, setBusy] = useState(true);

  const load = async () => {
    if (!managedOrgId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("id,name,slug,description")
      .eq("id", managedOrgId)
      .maybeSingle();
    setOrg((orgRow as Org) ?? null);

    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("organization_id", managedOrgId);
    const eventIds = (events ?? []).map((e) => e.id);

    let teams = 0;
    let live = 0;
    let photos = 0;
    if (eventIds.length) {
      const [teamRes, liveRes, photoRes] = await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: true }).in("event_id", eventIds),
        supabase.from("matches").select("id", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "live"),
        supabase.from("event_photos").select("id", { count: "exact", head: true }).in("event_id", eventIds),
      ]);
      teams = teamRes.count ?? 0;
      live = liveRes.count ?? 0;
      photos = photoRes.count ?? 0;
    }
    setCounts({ events: eventIds.length, teams, live, photos });
    setBusy(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedOrgId]);

  const quickActions = useMemo(
    () => [
      { to: "/admin/events", label: "Create event", icon: CalendarPlus, desc: "Spin up a new tournament" },
      { to: "/admin/teams", label: "Add teams", icon: Users, desc: "Register participating teams" },
      { to: "/admin/fixtures", label: "Generate fixtures", icon: Sparkles, desc: "Build the bracket / schedule" },
      { to: "/admin/fixtures", label: "Start a match", icon: Swords, desc: "Go live and record scores" },
    ],
    [],
  );

  if (loading || busy) {
    return <div className="container py-20 text-center text-muted-foreground text-sm">Loading…</div>;
  }

  // First-run onboarding: no organization yet (and not a global super admin).
  if (!managedOrgId && !isSuperAdmin) {
    return <CreateOrganization onCreated={load} />;
  }

  if (!managedOrgId && isSuperAdmin) {
    return (
      <div className="container py-12 max-w-xl text-center space-y-4">
        <h1 className="text-2xl font-display font-bold">Super admin</h1>
        <p className="text-muted-foreground">
          You manage the whole platform. Open the control center to govern organizations and events.
        </p>
        <Button asChild className="shadow-court"><Link to="/admin">Open control center</Link></Button>
      </div>
    );
  }

  const stats = [
    { label: "Events", value: counts.events, icon: Trophy },
    { label: "Teams", value: counts.teams, icon: Users },
    { label: "Live now", value: counts.live, icon: Swords },
    { label: "Media", value: counts.photos, icon: ImageIcon },
  ];

  return (
    <div className="container py-8 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center h-12 w-12 rounded-lg bg-gradient-court text-primary-foreground shadow-court">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold">{org?.name ?? "Your organization"}</h1>
              <Badge variant="secondary" className="capitalize">{orgRole ?? "organizer"}</Badge>
            </div>
            {org?.description && <p className="text-sm text-muted-foreground max-w-prose">{org.description}</p>}
          </div>
        </div>
        <Button asChild variant="outline"><Link to="/admin">Control center <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 shadow-card">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="font-display font-semibold mb-3">Quick actions</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {quickActions.map((a) => (
            <Card key={a.label} className="p-4 shadow-card hover:shadow-court transition-shadow">
              <Link to={a.to} className="flex items-center gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-lg bg-accent text-primary shrink-0">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{a.label}</span>
                  <span className="block text-xs text-muted-foreground truncate">{a.desc}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
