import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  event_id: string | null;
  match_id: string | null;
  team_id: string | null;
  read_at: string | null;
  created_at: string;
}

export default function AdminNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data as Notification[]) ?? []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = filter === "unread" ? items.filter((n) => !n.read_at) : items;

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read_at);
    if (!unread.length) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((n) => n.id));
    toast.success("Marked all as read");
  };

  const removeAll = async () => {
    if (!confirm("Delete all notifications?")) return;
    const { error } = await supabase.from("notifications").delete().not("id", "is", null);
    if (error) toast.error(error.message);
    else toast.success("Cleared");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" /> Notifications
        </h1>
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-border p-0.5 flex">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs rounded ${
                filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 text-xs rounded ${
                filter === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Unread
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={markAllRead}>
            <Check className="h-4 w-4 mr-1" /> Mark all read
          </Button>
          <Button size="sm" variant="ghost" onClick={removeAll}>
            <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Clear
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nothing here yet.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {visible.map((n) => (
            <Card
              key={n.id}
              className={`p-4 flex items-start gap-3 shadow-card ${n.read_at ? "" : "border-primary/40"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 className="font-display font-semibold text-sm">{n.title}</h3>
                  <Badge variant="outline" className="text-[10px]">{n.type.replace(/_/g, " ")}</Badge>
                  {!n.read_at && <Badge className="text-[10px]">New</Badge>}
                </div>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {n.event_id && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/events/${n.event_id}`}>Open</Link>
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
