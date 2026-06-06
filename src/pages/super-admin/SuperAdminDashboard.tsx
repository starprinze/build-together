import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Trophy, Users, Radio, Target, BarChart3, HardDrive, Activity, ArrowRight,
} from "lucide-react";

interface Metrics {
  organizations: number;
  events: number;
  users: number;
  liveMatches: number;
  predictionsToday: number;
  totalPredictions: number;
  mediaItems: number;
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

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const today = startOfToday();
      const [orgs, events, users, live, predToday, predTotal, media, acts] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("predictions").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("predictions").select("id", { count: "exact", head: true }),
        supabase.from("event_photos").select("id", { count: "exact", head: true }),
        supabase.from("notifications").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      setMetrics({
        organizations: orgs.count ?? 0,
        events: events.count ?? 0,
        users: users.count ?? 0,
        liveMatches: live.count ?? 0,
        predictionsToday: predToday.count ?? 0,
        totalPredictions: predTotal.count ?? 0,
        mediaItems: media.count ?? 0,
      });
      setActivity((acts.data as ActivityRow[]) ?? []);
    };
    void load();
  }, []);

  // ~1.6 MB average per stored media item — a friendly estimate, not exact billing.
  const storageMb = ((metrics?.mediaItems ?? 0) * 1.6).toFixed(1);

  const cards = [
    { label: "Organizations", value: metrics?.organizations, icon: Building2, to: "/super-admin/organizations" },
    { label: "Events", value: metrics?.events, icon: Trophy, to: "/super-admin/events" },
    { label: "Users", value: metrics?.users, icon: Users, to: "/super-admin/users" },
    { label: "Live Matches", value: metrics?.liveMatches, icon: Radio, to: "/super-admin/events" },
    { label: "Predictions Today", value: metrics?.predictionsToday, icon: Target, to: "/super-admin/analytics" },
    { label: "Total Predictions", value: metrics?.totalPredictions, icon: BarChart3, to: "/super-admin/analytics" },
    { label: "Media Items", value: metrics?.mediaItems, icon: HardDrive, to: "/super-admin/reports" },
    { label: "Storage (est.)", value: `${storageMb} MB`, icon: HardDrive, to: "/super-admin/reports" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Platform overview</h1>
          <p className="text-sm text-muted-foreground">Govern every organization, event, and member across Sportified.</p>
        </div>
        <Badge variant="secondary">Super Admin</Badge>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4 shadow-card hover:shadow-court transition-shadow">
            <Link to={c.to} className="block">
              <c.icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">
                {c.value ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </Link>
          </Card>
        ))}
      </div>

      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Recent activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 border-b border-border/60 last:border-0 pb-3 last:pb-0">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.title}</div>
                    {a.body && <div className="text-xs text-muted-foreground truncate">{a.body}</div>}
                    <div className="text-[11px] text-muted-foreground/70">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold mb-4">Quick actions</h2>
          <div className="space-y-2">
            {[
              { to: "/super-admin/organizations", label: "Manage organizations", icon: Building2 },
              { to: "/super-admin/events", label: "Manage events", icon: Trophy },
              { to: "/super-admin/users", label: "Manage users", icon: Users },
              { to: "/super-admin/analytics", label: "View analytics", icon: BarChart3 },
            ].map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <q.icon className="h-4 w-4 text-primary" />
                <span className="flex-1">{q.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
