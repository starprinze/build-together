import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Trophy, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "ongoing" | "completed";
}

const statusVariant: Record<Event["status"], string> = {
  upcoming: "bg-accent text-accent-foreground",
  ongoing: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground",
};

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        setEvents((data as Event[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <section className="bg-gradient-hero border-b border-border">
        <div className="container py-16 sm:py-24 text-center animate-fade-in">
          <Badge className="mb-5 bg-accent text-accent-foreground border-0">
            🏆 Live tournament brackets
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight mb-5">
            Where campus champions
            <br />
            <span className="bg-gradient-court bg-clip-text text-transparent">are made.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Browse upcoming and live tournaments, track team progress, and watch the bracket unfold in real time.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-court">
              <a href="#events">View events <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
          </div>
        </div>
      </section>

      <section id="events" className="container py-12 sm:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">All tournaments</h2>
            <p className="text-muted-foreground mt-1">Tap an event to see its live bracket.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-20">Loading events…</div>
        ) : events.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-display font-semibold text-lg mb-1">No tournaments yet</h3>
            <p className="text-muted-foreground text-sm">An admin will publish events here soon.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((e) => (
              <Link key={e.id} to={`/events/${e.id}`} className="group">
                <Card className="p-6 h-full transition-all hover:shadow-elevated hover:-translate-y-0.5 shadow-card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-court text-primary-foreground shadow-court">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusVariant[e.status]}`}>
                      {e.status}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {e.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{e.sport}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(e.start_date).toLocaleDateString()} → {new Date(e.end_date).toLocaleDateString()}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
