import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Camera } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  start_date: string | null;
  photo_count?: number;
}

export default function Gallery() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: evts } = await supabase
        .from("events")
        .select("id, name, starts_at")
        .order("starts_at", { ascending: false });
      const list = (evts as EventRow[]) ?? [];
      const withCounts = await Promise.all(
        list.map(async (e) => {
          const { count } = await supabase
            .from("event_photos")
            .select("id", { count: "exact", head: true })
            .eq("event_id", e.id);
          return { ...e, photo_count: count ?? 0 };
        }),
      );
      setEvents(withCounts.filter((e) => (e.photo_count ?? 0) > 0));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">Gallery</h1>
        <p className="text-muted-foreground">Highlights and photos from recent events.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center">
          <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">No media yet</h3>
          <p className="text-sm text-muted-foreground">Check back soon for event highlights.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <Link key={e.id} to={`/events/${e.id}`}>
              <Card className="p-6 hover:shadow-court transition-shadow">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Camera className="h-3.5 w-3.5" />
                  {e.photo_count} item{e.photo_count === 1 ? "" : "s"}
                </div>
                <h3 className="font-display font-semibold text-lg">{e.name}</h3>
                {e.starts_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(e.starts_at).toLocaleDateString()}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
