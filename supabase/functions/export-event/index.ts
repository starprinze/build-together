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

// Minimal ZIP builder (STORE method, no compression). Sufficient for .docx.
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
async function buildDocxZip(files: { path: string; data: Uint8Array }[]): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = enc.encode(f.path);
    const crc = crc32(f.data);
    const size = f.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); // version
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // method=store
    dv.setUint16(10, 0, true); // time
    dv.setUint16(12, 0x21, true); // date (1980-01-01)
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);
    dv.setUint32(22, size, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, f.data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(central.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0x21, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, size, true);
    cdv.setUint32(24, size, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length + f.data.length;
  }
  const centralSize = centralParts.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, offset, true);

  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  for (const part of localParts) { out.set(part, p); p += part.length; }
  for (const part of centralParts) { out.set(part, p); p += part.length; }
  out.set(eocd, p);
  return out;
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

    if (format === "csv") {
      const esc = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines: string[] = [];
      lines.push(`# ${event.name} (${event.sport}) — ${event.format}`);
      lines.push("");
      lines.push("Bracket,Round,Match,TeamA,ScoreA,TeamB,ScoreB,Winner,Status");
      for (const m of (matches ?? []) as any[]) {
        lines.push([
          m.bracket ?? "main",
          m.round,
          m.match_number,
          m.team_a?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
          m.score_a ?? "",
          m.team_b?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
          m.score_b ?? "",
          m.winner?.name ?? "",
          m.status,
        ].map(esc).join(","));
      }
      lines.push("");
      lines.push("Pos,Team,Played,Wins,Losses,PF,PA,Diff,Pts");
      standings.forEach((s, i) =>
        lines.push([i + 1, s.name, s.played, s.wins, s.losses, s.pf, s.pa, s.diff, s.points].map(esc).join(",")),
      );
      const csv = lines.join("\n");
      return new Response(
        JSON.stringify({
          filename: `${baseName}.csv`,
          mime: "text/csv",
          data: bytesToBase64(new TextEncoder().encode(csv)),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (format === "docx") {
      // Minimal valid .docx generated from scratch (no extra deps).
      const escapeXml = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const para = (text: string, opts: { bold?: boolean; size?: number; heading?: boolean } = {}) => {
        const sz = opts.size ?? 22;
        const rPr = `<w:rPr>${opts.bold ? "<w:b/>" : ""}<w:sz w:val="${sz}"/></w:rPr>`;
        return `<w:p>${opts.heading ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' : ""}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
      };
      const tableRow = (cells: string[], header = false) => {
        const tcs = cells
          .map(
            (c) =>
              `<w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>${para(c, { bold: header, size: 20 })}</w:tc>`,
          )
          .join("");
        return `<w:tr>${tcs}</w:tr>`;
      };
      const tbl = (rows: string[][]) =>
        `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/></w:tblBorders></w:tblPr>${rows.map((r, i) => tableRow(r, i === 0)).join("")}</w:tbl>`;

      const body =
        para(event.name, { heading: true, bold: true, size: 36 }) +
        para(`${event.sport} · ${event.format} · ${event.start_date} → ${event.end_date}`, { size: 20 }) +
        para("Teams", { bold: true, size: 28 }) +
        tbl([
          ["Name", "Department", "Captain"],
          ...((teams ?? []).map((t: any) => [t.name, t.department, t.captain])),
        ]) +
        para("", {}) +
        para("Fixtures", { bold: true, size: 28 }) +
        tbl([
          ["Bracket", "Rd", "#", "Team A", "Score", "Team B", "Winner", "Status"],
          ...((matches ?? []).map((m: any) => [
            m.bracket ?? "main",
            String(m.round),
            String(m.match_number),
            m.team_a?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
            m.score_a != null && m.score_b != null ? `${m.score_a} – ${m.score_b}` : "",
            m.team_b?.name ?? (m.status === "bye" ? "BYE" : "TBD"),
            m.winner?.name ?? "",
            m.status,
          ])),
        ]) +
        para("", {}) +
        para("Standings", { bold: true, size: 28 }) +
        tbl([
          ["#", "Team", "P", "W", "L", "PF", "PA", "Diff", "Pts"],
          ...standings.map((s, i) => [
            String(i + 1), s.name, String(s.played), String(s.wins), String(s.losses),
            String(s.pf), String(s.pa), String(s.diff), String(s.points),
          ]),
        ]);

      const documentXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;

      const contentTypes =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`;
      const rootRels =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`;

      // Build a minimal zip (store-only, no compression) using a tiny inline implementation.
      const docxBytes = await buildDocxZip([
        { path: "[Content_Types].xml", data: new TextEncoder().encode(contentTypes) },
        { path: "_rels/.rels", data: new TextEncoder().encode(rootRels) },
        { path: "word/document.xml", data: new TextEncoder().encode(documentXml) },
      ]);

      return new Response(
        JSON.stringify({
          filename: `${baseName}.docx`,
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          data: bytesToBase64(docxBytes),
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
