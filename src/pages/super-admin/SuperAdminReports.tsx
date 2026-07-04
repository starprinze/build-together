import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  sport: string;
  status: string;
  start_date: string;
}

export default function SuperAdminReports() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("id,name,sport,status,start_date")
        .order("start_date", { ascending: false });
      setEvents((data as EventRow[]) ?? []);
    };
    void load();
  }, []);

  const exportAll = () => {
    const header = ["Name", "Sport", "Status", "Start date"];
    const rows = events.map((e) => [e.name, e.sport, e.status, e.start_date]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sportified-events.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEvent = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("export-event", {
        body: { eventId: id, format: "excel" },
      });
      if (error) throw error;
      const { filename, mime, data: b64 } = data as { filename: string; mime: string; data: string };
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Export platform data for any tournament.</p>
        </div>
        <Button onClick={exportAll} variant="outline" disabled={events.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export all events (CSV)
        </Button>
      </header>

      <Card className="divide-y divide-border p-0">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">No events to report on yet.</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-4">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{e.name}</div>
                <div className="text-xs text-muted-foreground">{e.sport} · {new Date(e.start_date).toLocaleDateString()}</div>
              </div>
              <Badge variant="secondary" className="capitalize hidden sm:inline-flex">{e.status}</Badge>
              <Button size="sm" variant="outline" disabled={busyId === e.id} onClick={() => exportEvent(e.id)}>
                <Download className="h-4 w-4 mr-1.5" /> {busyId === e.id ? "…" : "Export"}
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
