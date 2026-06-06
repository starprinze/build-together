import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, ArrowRight } from "lucide-react";

interface EventMedia {
  id: string;
  name: string;
  photos: number;
}

export default function OrgGallery() {
  const { managedOrgId, isSuperAdmin } = useAuth();
  const [events, setEvents] = useState<EventMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase.from("events").select("id,name").neq("status", "archived");
      if (!isSuperAdmin && managedOrgId) q = q.eq("organization_id", managedOrgId);
      const { data: evs } = await q;
      const list = (evs ?? []) as { id: string; name: string }[];

      const counts: Record<string, number> = {};
      if (list.length) {
        const { data: photos } = await supabase
          .from("event_photos")
          .select("event_id")
          .in("event_id", list.map((e) => e.id));
        (photos ?? []).forEach((p: any) => {
          counts[p.event_id] = (counts[p.event_id] ?? 0) + 1;
        });
      }
      setEvents(list.map((e) => ({ id: e.id, name: e.name, photos: counts[e.id] ?? 0 })));
      setLoading(false);
    };
    void load();
  }, [managedOrgId, isSuperAdmin]);

  if (loading) return <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-display font-bold">Gallery</h1>
        <p className="text-sm text-muted-foreground">Media for each of your events. Open an event to upload and manage photos.</p>
      </header>

      {events.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No events yet.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {events.map((e) => (
            <Card key={e.id} className="p-4 shadow-card hover:shadow-court transition-shadow">
              <Link to={`/events/${e.id}`} className="flex items-center gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-lg bg-accent text-primary shrink-0">
                  <ImageIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{e.name}</span>
                  <Badge variant="secondary" className="mt-0.5">{e.photos} media</Badge>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
