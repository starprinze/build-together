import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CreateOrganization from "@/components/CreateOrganization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Users, Radio, Target, Image as ImageIcon, Activity,
  CalendarPlus, Swords, Sparkles, ArrowRight,
} from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface ActivityRow {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function OrgDashboard() {
  const { user, managedOrgId, isSuperAdmin, orgRole, loading } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [counts, setCounts] = useState({ events: 0, teams: 0, live: 0, predToday: 0 });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
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
      .eq("organization_id", managedOrgId)
      .neq("status", "archived");
    const eventIds = (events ?? []).map((e) => e.id);

    let teams = 0;
    let live = 0;
    let predToday = 0;
    let acts: ActivityRow[] = [];
    if (eventIds.length) {
      const [teamRes, liveRes, matchRes, actRes] = await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: true }).in("event_id", eventIds),
        supabase.from("matches").select("id", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "live"),
        supabase.from("matches").select("id").in("event_id", eventIds),
        supabase.from("notifications").select("id,title,body,created_at").in("event_id", eventIds).order("created_at", { ascending: false }).limit(6),
      ]);
      teams = teamRes.count ?? 0;
      live = liveRes.count ?? 0;
      acts = (actRes.data as ActivityRow[]) ?? [];
      const matchIds = (matchRes.data ?? []).map((m: any) => m.id);
      if (matchIds.length) {
        const { count } = await supabase
          .from("predictions")
          .select("id", { count: "exact", head: true })
          .in("match_id", matchIds)
          .gte("created_at", startOfToday());
        predToday = count ?? 0;
      }
    }
    setCounts({ events: eventIds.length, teams, live, predToday });
    setActivity(acts);
    setBusy(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedOrgId]);

  const quickActions = useMemo(
    () => [
      { to: "/organizer/events", label: "Create event", icon: CalendarPlus, desc: "Spin up a new tournament" },
      { to: "/organizer/teams", label: "Add teams", icon: Users, desc: "Register participating teams" },
      { to: "/organizer/matches", label: "Generate fixtures", icon: Sparkles, desc: "Build the bracket / schedule" },
      { to: "/organizer/matches", label: "Start a match", icon: Swords, desc: "Go live and record scores" },
    ],
    [],
  );

  if (loading || busy) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="py-12 max-w-xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-display font-bold">Sign in to continue</h1>
        <p className="text-muted-foreground">Create an account or sign in to start your organization.</p>
        <Button asChild className="shadow-court"><Link to="/login?redirect=/organizer">Sign in</Link></Button>
      </div>
    );
  }

  // First-run onboarding: no organization yet (and not a global super admin).
  if (!managedOrgId && !isSuperAdmin) {
    return <CreateOrganization onCreated={load} />;
  }

  if (!managedOrgId && isSuperAdmin) {
    return (
      <div className="py-12 max-w-xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-display font-bold">Super admin</h1>
        <p className="text-muted-foreground">You govern the whole platform. Open the platform control center.</p>
        <Button asChild className="shadow-court"><Link to="/super-admin">Open platform control</Link></Button>
      </div>
    );
  }

  const stats = [
    { label: "Active Events", value: counts.events, icon: Trophy },
    { label: "Live Matches", value: counts.live, icon: Radio },
    { label: "Predictions Today", value: counts.predToday, icon: Target },
    { label: "Registered Teams", value: counts.teams, icon: Users },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">{org?.name ?? "Your organization"}</h1>
            <Badge variant="secondary" className="capitalize">{orgRole ?? "organizer"}</Badge>
          </div>
          {org?.description
            ? <p className="text-sm text-muted-foreground max-w-prose">{org.description}</p>
            : <p className="text-sm text-muted-foreground">Run your tournaments from one place.</p>}
        </div>
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

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-display font-semibold">Quick actions</h2>
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
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Recent activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 border-b border-border/60 last:border-0 pb-3 last:pb-0">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.title}</div>
                    {a.body && <div className="text-xs text-muted-foreground truncate">{a.body}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
