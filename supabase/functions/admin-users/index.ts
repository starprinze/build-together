// Admin Users management edge function
// Verifies caller is an admin, then performs privileged user operations
// using the service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Missing bearer token" });
    }

    // Authenticated client (uses caller's JWT) — for identity + admin check
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json(401, { error: "Invalid session" });
    }
    const callerId = userData.user.id;

    // Verify caller has admin role
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json(403, { error: "Admin access required" });
    }

    // Privileged client for user lookups + role mutations
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action === "list") {
      const page = Math.max(1, Number(body.page ?? 1));
      const perPage = Math.min(200, Math.max(1, Number(body.perPage ?? 100)));
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json(500, { error: error.message });

      const userIds = data.users.map((u) => u.id);
      let adminIds = new Set<string>();
      if (userIds.length) {
        const { data: roles } = await admin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .in("user_id", userIds);
        adminIds = new Set((roles ?? []).map((r: any) => r.user_id));
      }

      return json(200, {
        users: data.users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          is_admin: adminIds.has(u.id),
        })),
      });
    }

    if (action === "grant" || action === "revoke") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) return json(400, { error: "Email is required" });

      // Find user by email by paginating listUsers
      let target: { id: string; email?: string } | null = null;
      let page = 1;
      while (page <= 20) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) return json(500, { error: error.message });
        const found = data.users.find(
          (u) => (u.email ?? "").toLowerCase() === email,
        );
        if (found) {
          target = { id: found.id, email: found.email ?? undefined };
          break;
        }
        if (data.users.length < 200) break;
        page++;
      }

      if (!target) {
        return json(404, { error: `No user found with email ${email}` });
      }

      if (action === "grant") {
        const { error } = await admin
          .from("user_roles")
          .insert({ user_id: target.id, role: "admin" });
        // Ignore unique violation (already admin)
        if (error && !String(error.message).toLowerCase().includes("duplicate")) {
          return json(500, { error: error.message });
        }
        return json(200, { ok: true, user_id: target.id, granted: true });
      }

      // revoke — block self-revoke if it would leave zero admins
      if (target.id === callerId) {
        const { count } = await admin
          .from("user_roles")
          .select("user_id", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) <= 1) {
          return json(400, {
            error: "Cannot revoke the last admin. Grant another user first.",
          });
        }
      }

      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", target.id)
        .eq("role", "admin");
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true, user_id: target.id, revoked: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("admin-users error", e);
    return json(500, { error: (e as Error).message });
  }
});
