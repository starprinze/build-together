// Export an event's fixtures + standings as PDF or Excel.
// Returns { filename, mime, data: base64 } so the client can download it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  eventId: string;
  format: "pdf" | "excel" | "csv" | "docx";
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function safeName(s: string) {
  return s.replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").slice(0, 60) || "event";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userResult.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eventId, format } = (await req.json()) as Body;
    if (!eventId || !["pdf", "excel", "csv", "docx"].includes(format)) {
      return new Response(JSON.stringify({ error: "eventId and format=pdf|excel|csv|docx required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for reads (so we don't depend on RLS for internal data we already vetted)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: event }, { data: matches }, { data: teams }] = await Promise.all([
      admin.from("events").select("*").eq("id", eventId).maybeSingle(),
      admin
        .from("matches")
        .select(
          "*, team_a:team_a_id(id,name,department), team_b:team_b_id(id,name,department), winner:winner_id(id,name)",
        )
        .eq("event_id", eventId)
        .order("bracket")
        .order("round")
        .order("match_number"),
      admin.from("teams").select("*").eq("event_id", eventId).order("name"),
    ]);

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute standings
    type Row = {
      teamId: string;
      name: string;
      played: number;
      wins: number;
      losses: number;
      pf: number;
      pa: number;
      diff: number;
      points: number;
    };
    const standingsMap = new Map<string, Row>();
    for (const t of teams ?? []) {
      standingsMap.set(t.id, {
        teamId: t.id,
        name: t.name,
        played: 0, wins: 0, losses: 0, pf: 0, pa: 0, diff: 0, points: 0,
      });
    }
    for (const m of matches ?? []) {
      if (m.status !== "completed" || !m.winner_id || !m.team_a_id || !m.team_b_id) continue;
      const a = standingsMap.get(m.team_a_id);
      const b = standingsMap.get(m.team_b_id);
      if (!a || !b) continue;
      const sa = m.score_a ?? 0;
      const sb = m.score_b ?? 0;
      a.played++; b.played++; a.pf += sa; a.pa += sb; b.pf += sb; b.pa += sa;
      if (m.winner_id === a.teamId) { a.wins++; a.points += 3; b.losses++; }
      else { b.wins++; b.points += 3; a.losses++; }
    }
    for (const r of standingsMap.values()) r.diff = r.pf - r.pa;
    const standings = [...standingsMap.values()].sort(
      (x, y) => y.points - x.points || y.diff - x.diff || y.pf - x.pf || x.name.localeCompare(y.name),
    );

    const baseName = safeName(event.name);

    if (format === "excel") {
      const wb = XLSX.utils.book_new();

      const overviewRows = [
        ["Event", event.name],
        ["Sport", event.sport],
        ["Format", event.format],
        ["Status", event.status],
        ["Dates", `${event.start_date} → ${event.end_date}`],
        ["Teams", String(teams?.length ?? 0)],
        ["Matches", String(matches?.length ?? 0)],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewRows), "Overview");

      const teamRows = [
        ["Name", "Department", "Captain", "Roster"],
        ...((teams ?? []).map((t: any) => [t.name, t.department, t.captain, t.roster ?? ""])),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(teamRows), "Teams");

      const fixtureRows = [
        ["Bracket", "Round", "Match", "Team A", "Score A", "Team B", "Score B", "Winner", "Status"],
        ...((matches ?? []).map((m: any) => [
          m.bracket ?? "main",
          m.round,
          m.match_number,
          m.team_a?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
          m.score_a ?? "",
          m.team_b?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
          m.score_b ?? "",
          m.winner?.name ?? "",
          m.status,
        ])),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fixtureRows), "Fixtures");

      const standingsRows = [
        ["Pos", "Team", "P", "W", "L", "PF", "PA", "Diff", "Pts"],
        ...standings.map((s, i) => [i + 1, s.name, s.played, s.wins, s.losses, s.pf, s.pa, s.diff, s.points]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(standingsRows), "Standings");

      const bin = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      return new Response(
        JSON.stringify({
          filename: `${baseName}.xlsx`,
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          data: bytesToBase64(new Uint8Array(bin)),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // PDF
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(event.name, 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `${event.sport} · ${event.format} · ${event.start_date} → ${event.end_date}`,
      40,
      68,
    );

    autoTable(doc, {
      startY: 90,
      head: [["Team", "Department", "Captain"]],
      body: (teams ?? []).map((t: any) => [t.name, t.department, t.captain]),
      headStyles: { fillColor: [20, 60, 90] },
      styles: { fontSize: 9 },
      didDrawPage: () => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Teams", 40, 86);
      },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 24,
      head: [["Bracket", "Rd", "#", "Team A", "Score", "Team B", "Winner", "Status"]],
      body: (matches ?? []).map((m: any) => [
        m.bracket ?? "main",
        m.round,
        m.match_number,
        m.team_a?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
        m.score_a != null && m.score_b != null ? `${m.score_a} – ${m.score_b}` : "",
        m.team_b?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
        m.winner?.name ?? "",
        m.status,
      ]),
      headStyles: { fillColor: [20, 60, 90] },
      styles: { fontSize: 8 },
      didDrawPage: () => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Fixtures", 40, (doc as any).lastAutoTable?.finalY != null ? (doc as any).lastAutoTable.finalY + 20 : 40);
      },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 24,
      head: [["#", "Team", "P", "W", "L", "PF", "PA", "Diff", "Pts"]],
      body: standings.map((s, i) => [i + 1, s.name, s.played, s.wins, s.losses, s.pf, s.pa, s.diff, s.points]),
      headStyles: { fillColor: [20, 60, 90] },
      styles: { fontSize: 9 },
      didDrawPage: () => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Standings", 40, (doc as any).lastAutoTable?.finalY != null ? (doc as any).lastAutoTable.finalY + 20 : 40);
      },
    });

    const pdfBytes = doc.output("arraybuffer");
    return new Response(
      JSON.stringify({
        filename: `${baseName}.pdf`,
        mime: "application/pdf",
        data: bytesToBase64(new Uint8Array(pdfBytes)),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("export-event error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
