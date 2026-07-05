// Admin Users management edge function — Role & Access Management.
// Verifies the caller is a super-admin, then performs privileged user and
// role operations using the service role key. Every mutation is written to
// public.audit_log.
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

// deno-lint-ignore no-explicit-any
type Admin = any;

async function countSuperAdmins(admin: Admin): Promise<number> {
  const { count } = await admin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

async function isSuperAdmin(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function findUserByEmail(admin: Admin, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u: Admin) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Missing bearer token" });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Invalid session" });
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? null;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (!(await isSuperAdmin(admin, callerId))) {
      return json(403, { error: "Super Admin access required" });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    const audit = async (
      act: string,
      opts: { targetUserId?: string; targetEmail?: string; organizationId?: string; details?: unknown },
    ) => {
      await admin.from("audit_log").insert({
        actor_id: callerId,
        actor_email: callerEmail,
        action: act,
        target_user_id: opts.targetUserId ?? null,
        target_email: opts.targetEmail ?? null,
        organization_id: opts.organizationId ?? null,
        details: opts.details ?? {},
      });
    };

    // ---------------------------------------------------------------- list
    if (action === "list") {
      const page = Math.max(1, Number(body.page ?? 1));
      const perPage = Math.min(200, Math.max(1, Number(body.perPage ?? 200)));
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json(500, { error: error.message });

      const userIds = data.users.map((u: Admin) => u.id);
      let adminIds = new Set<string>();
      const membershipsByUser: Record<string, Array<{ organization_id: string; role: string }>> = {};
      const profilesByUser: Record<string, string | null> = {};

      if (userIds.length) {
        const [{ data: roles }, { data: members }, { data: profiles }, { data: orgs }] =
          await Promise.all([
            admin.from("user_roles").select("user_id").eq("role", "admin").in("user_id", userIds),
            admin.from("organization_members").select("user_id,organization_id,role").in("user_id", userIds),
            admin.from("profiles").select("user_id,username").in("user_id", userIds),
            admin.from("organizations").select("id,name,owner_id"),
          ]);
        adminIds = new Set((roles ?? []).map((r: Admin) => r.user_id));
        (members ?? []).forEach((m: Admin) => {
          (membershipsByUser[m.user_id] ??= []).push({ organization_id: m.organization_id, role: m.role });
        });
        (profiles ?? []).forEach((p: Admin) => { profilesByUser[p.user_id] = p.username; });
        // Owners count as organizers of their org.
        (orgs ?? []).forEach((o: Admin) => {
          if (o.owner_id && userIds.includes(o.owner_id)) {
            const list = (membershipsByUser[o.owner_id] ??= []);
            if (!list.some((m) => m.organization_id === o.id)) {
              list.push({ organization_id: o.id, role: "owner" });
            }
          }
        });
        const orgNames: Record<string, string> = {};
        (orgs ?? []).forEach((o: Admin) => { orgNames[o.id] = o.name; });

        return json(200, {
          users: data.users.map((u: Admin) => ({
            id: u.id,
            email: u.email,
            name: profilesByUser[u.id] ?? null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            disabled: !!u.banned_until && new Date(u.banned_until) > new Date(),
            is_admin: adminIds.has(u.id),
            memberships: (membershipsByUser[u.id] ?? []).map((m) => ({
              ...m,
              organization_name: orgNames[m.organization_id] ?? "—",
            })),
          })),
          organizations: (orgs ?? []).map((o: Admin) => ({ id: o.id, name: o.name })),
        });
      }
      return json(200, { users: [], organizations: [] });
    }

    // ---------------------------------------------------------------- audit
    if (action === "audit") {
      const { data, error } = await admin
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json(500, { error: error.message });
      return json(200, { entries: data ?? [] });
    }

    // Resolve a target user for the mutating actions below.
    const resolveTarget = async (): Promise<Admin | null> => {
      if (body.userId) {
        const { data, error } = await admin.auth.admin.getUserById(String(body.userId));
        if (error) throw new Error(error.message);
        return data.user;
      }
      if (body.email) return await findUserByEmail(admin, String(body.email));
      return null;
    };

    // ------------------------------------------------------------- setRole
    if (action === "setRole") {
      const role = String(body.role ?? "");
      const target = await resolveTarget();
      if (!target) return json(404, { error: "User not found" });
      const orgId = body.organizationId ? String(body.organizationId) : null;

      const targetIsSuper = await isSuperAdmin(admin, target.id);

      // Guard: don't strip the last / own super-admin when demoting.
      if (targetIsSuper && role !== "super_admin") {
        if (target.id === callerId) {
          return json(400, { error: "You cannot remove your own Super Admin role." });
        }
        if ((await countSuperAdmins(admin)) <= 1) {
          return json(400, { error: "Cannot demote the last Super Admin." });
        }
      }

      if (role === "super_admin") {
        const { error } = await admin.from("user_roles").insert({ user_id: target.id, role: "admin" });
        if (error && !String(error.message).toLowerCase().includes("duplicate")) {
          return json(500, { error: error.message });
        }
      } else if (role === "org_admin" || role === "staff") {
        if (!orgId) return json(400, { error: "Select an organization for this role." });
        // Drop super-admin if present, then set the org membership.
        await admin.from("user_roles").delete().eq("user_id", target.id).eq("role", "admin");
        const memberRole = role === "org_admin" ? "organizer" : "staff";
        await admin.from("organization_members").delete()
          .eq("user_id", target.id).eq("organization_id", orgId);
        const { error } = await admin.from("organization_members")
          .insert({ user_id: target.id, organization_id: orgId, role: memberRole });
        if (error) return json(500, { error: error.message });
      } else if (role === "viewer") {
        await admin.from("user_roles").delete().eq("user_id", target.id).eq("role", "admin");
        await admin.from("organization_members").delete().eq("user_id", target.id);
      } else {
        return json(400, { error: "Unknown role" });
      }

      await audit("role.change", {
        targetUserId: target.id, targetEmail: target.email, organizationId: orgId ?? undefined,
        details: { role },
      });
      return json(200, { ok: true });
    }

    // ---------------------------------------------------------- assignOrg
    if (action === "assignOrg") {
      const target = await resolveTarget();
      if (!target) return json(404, { error: "User not found" });
      const orgId = String(body.organizationId ?? "");
      const memberRole = String(body.role ?? "viewer");
      if (!orgId) return json(400, { error: "Organization is required" });
      await admin.from("organization_members").delete()
        .eq("user_id", target.id).eq("organization_id", orgId);
      const { error } = await admin.from("organization_members")
        .insert({ user_id: target.id, organization_id: orgId, role: memberRole });
      if (error) return json(500, { error: error.message });
      await audit("org.assign", {
        targetUserId: target.id, targetEmail: target.email, organizationId: orgId,
        details: { role: memberRole },
      });
      return json(200, { ok: true });
    }

    // -------------------------------------------------------- setDisabled
    if (action === "setDisabled") {
      const target = await resolveTarget();
      if (!target) return json(404, { error: "User not found" });
      const disabled = !!body.disabled;
      if (disabled && target.id === callerId) {
        return json(400, { error: "You cannot disable your own account." });
      }
      const { error } = await admin.auth.admin.updateUserById(target.id, {
        ban_duration: disabled ? "876000h" : "none",
      });
      if (error) return json(500, { error: error.message });
      await audit(disabled ? "account.disable" : "account.enable", {
        targetUserId: target.id, targetEmail: target.email,
      });
      return json(200, { ok: true });
    }

    // ------------------------------------------------------- resetPassword
    if (action === "resetPassword") {
      const target = await resolveTarget();
      if (!target?.email) return json(404, { error: "User not found" });
      const redirectTo = String(body.redirectTo ?? "");
      const { error } = await admin.auth.resetPasswordForEmail(target.email, {
        redirectTo: redirectTo || undefined,
      });
      if (error) return json(500, { error: error.message });
      await audit("account.reset_password", { targetUserId: target.id, targetEmail: target.email });
      return json(200, { ok: true });
    }

    // --------------------------------------------------------- deleteUser
    if (action === "deleteUser") {
      const target = await resolveTarget();
      if (!target) return json(404, { error: "User not found" });
      if (target.id === callerId) return json(400, { error: "You cannot delete your own account." });
      if (await isSuperAdmin(admin, target.id) && (await countSuperAdmins(admin)) <= 1) {
        return json(400, { error: "Cannot delete the last Super Admin." });
      }
      const { error } = await admin.auth.admin.deleteUser(target.id);
      if (error) return json(500, { error: error.message });
      await audit("account.delete", { targetUserId: target.id, targetEmail: target.email });
      return json(200, { ok: true });
    }

    // -------------------------------------------------------- impersonate
    if (action === "impersonate") {
      const target = await resolveTarget();
      if (!target?.email) return json(404, { error: "User not found" });
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: target.email,
        options: { redirectTo: String(body.redirectTo ?? "") || undefined },
      });
      if (error) return json(500, { error: error.message });
      await audit("account.impersonate", { targetUserId: target.id, targetEmail: target.email });
      return json(200, { ok: true, action_link: data?.properties?.action_link ?? null });
    }

    // ---------------------------------------------- legacy grant / revoke
    if (action === "grant" || action === "revoke") {
      const target = await findUserByEmail(admin, String(body.email ?? ""));
      if (!target) return json(404, { error: "User not found" });
      if (action === "grant") {
        const { error } = await admin.from("user_roles").insert({ user_id: target.id, role: "admin" });
        if (error && !String(error.message).toLowerCase().includes("duplicate")) {
          return json(500, { error: error.message });
        }
      } else {
        if (target.id === callerId && (await countSuperAdmins(admin)) <= 1) {
          return json(400, { error: "Cannot revoke the last admin." });
        }
        await admin.from("user_roles").delete().eq("user_id", target.id).eq("role", "admin");
      }
      await audit(action === "grant" ? "role.grant_admin" : "role.revoke_admin", {
        targetUserId: target.id, targetEmail: target.email,
      });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("admin-users error", e);
    return json(500, { error: (e as Error).message });
  }
});
