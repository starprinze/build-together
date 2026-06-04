import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Trophy, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EventRow {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "ongoing" | "completed";
}

const statusBadge: Record<EventRow["status"], string> = {
  upcoming: "bg-accent text-accent-foreground border-transparent",
  ongoing: "bg-success/15 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-transparent",
};

const filters = ["all", "ongoing", "upcoming", "completed"] as const;
type Filter = (typeof filters)[number];

export default function Events() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("events")
      .select("id,name,sport,start_date,end_date,status")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setEvents((data as EventRow[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const matchesFilter = filter === "all" || e.status === filter;
      const matchesQuery =
        !q || e.name.toLowerCase().includes(q) || e.sport.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [events, filter, query]);

  return (
    <div className="container py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">Tournaments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse every event and step inside its live ecosystem.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tournaments…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-1">No tournaments found</h3>
          <p className="text-muted-foreground text-sm">Try a different filter or search term.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((e) => (
            <Link key={e.id} to={`/events/${e.id}`} className="group">
              <Card className="p-6 h-full transition-all hover:shadow-elevated hover:-translate-y-0.5 shadow-card relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-court opacity-10 group-hover:opacity-20 transition-opacity"
                />
                <div className="flex items-start justify-between mb-4 relative">
                  <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-court text-primary-foreground shadow-court">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                      statusBadge[e.status],
                    )}
                  >
                    {e.status}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                  {e.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{e.sport}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(e.start_date).toLocaleDateString()} →{" "}
                  {new Date(e.end_date).toLocaleDateString()}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
