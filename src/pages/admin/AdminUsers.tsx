import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RefreshCw, MoreVertical, ShieldCheck, Building2, UserCog, Ban, CheckCircle2,
  KeyRound, Trash2, UserRound, ScrollText, Search, LogIn,
} from "lucide-react";

type PlatformRole = "super_admin" | "org_admin" | "staff" | "viewer";

interface Membership { organization_id: string; role: string; organization_name: string }
interface AdminUserRow {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  disabled: boolean;
  is_admin: boolean;
  memberships: Membership[];
}
interface OrgOpt { id: string; name: string }
interface AuditEntry {
  id: string;
  actor_email: string | null;
  action: string;
  target_email: string | null;
  organization_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ROLE_META: Record<PlatformRole, { label: string; cls: string }> = {
  super_admin: { label: "Super Admin", cls: "bg-primary text-primary-foreground" },
  org_admin: { label: "Organization Admin", cls: "bg-accent text-accent-foreground" },
  staff: { label: "Staff", cls: "bg-secondary text-secondary-foreground" },
  viewer: { label: "Viewer", cls: "bg-muted text-muted-foreground" },
};

function platformRole(u: AdminUserRow): PlatformRole {
  if (u.is_admin) return "super_admin";
  if (u.memberships.some((m) => m.role === "owner" || m.role === "organizer")) return "org_admin";
  if (u.memberships.some((m) => m.role === "staff")) return "staff";
  return "viewer";
}

function primaryOrg(u: AdminUserRow): string {
  return u.memberships[0]?.organization_name ?? "—";
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [orgs, setOrgs] = useState<OrgOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [roleValue, setRoleValue] = useState<PlatformRole>("viewer");
  const [roleOrg, setRoleOrg] = useState<string>("");

  const [orgTarget, setOrgTarget] = useState<AdminUserRow | null>(null);
  const [assignOrg, setAssignOrg] = useState<string>("");
  const [assignRole, setAssignRole] = useState<string>("staff");

  const [profileTarget, setProfileTarget] = useState<AdminUserRow | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body: payload });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list", page: 1, perPage: 200 });
      setUsers(data.users ?? []);
      setOrgs(data.organizations ?? []);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadAudit = async () => {
    try {
      const data = await call({ action: "audit" });
      setAudit(data.entries ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load audit log");
    }
  };

  const run = async (payload: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      await call(payload);
      toast.success(ok);
      await load();
      return true;
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !(u.email ?? "").toLowerCase().includes(q) && !(u.name ?? "").toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && platformRole(u) !== roleFilter) return false;
      if (statusFilter !== "all" && (statusFilter === "disabled") !== u.disabled) return false;
      if (orgFilter !== "all" && !u.memberships.some((m) => m.organization_id === orgFilter)) return false;
      return true;
    });
  }, [users, search, roleFilter, orgFilter, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((u) => u.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openRole = (u: AdminUserRow) => {
    setRoleTarget(u);
    setRoleValue(platformRole(u));
    setRoleOrg(u.memberships[0]?.organization_id ?? "");
  };
  const submitRole = async () => {
    if (!roleTarget) return;
    if ((roleValue === "org_admin" || roleValue === "staff") && !roleOrg) {
      return toast.error("Select an organization for this role");
    }
    const okd = await run(
      { action: "setRole", userId: roleTarget.id, role: roleValue, organizationId: roleOrg || undefined },
      "Role updated",
    );
    if (okd) setRoleTarget(null);
  };

  const openAssign = (u: AdminUserRow) => {
    setOrgTarget(u);
    setAssignOrg(orgs[0]?.id ?? "");
    setAssignRole("staff");
  };
  const submitAssign = async () => {
    if (!orgTarget || !assignOrg) return toast.error("Select an organization");
    const okd = await run(
      { action: "assignOrg", userId: orgTarget.id, organizationId: assignOrg, role: assignRole },
      "Organization assigned",
    );
    if (okd) setOrgTarget(null);
  };

  const resetPassword = (u: AdminUserRow) =>
    run({ action: "resetPassword", userId: u.id, redirectTo: `${window.location.origin}/reset-password` },
      "Password reset email sent");

  const toggleDisabled = (u: AdminUserRow) =>
    run({ action: "setDisabled", userId: u.id, disabled: !u.disabled },
      u.disabled ? "Account enabled" : "Account disabled");

  const deleteUser = (u: AdminUserRow) => {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    run({ action: "deleteUser", userId: u.id }, "User deleted");
  };

  const impersonate = async (u: AdminUserRow) => {
    if (!confirm(`Generate a one-time sign-in link for ${u.email}?`)) return;
    setBusy(true);
    try {
      const data = await call({ action: "impersonate", userId: u.id, redirectTo: window.location.origin });
      if (data.action_link) {
        window.open(data.action_link, "_blank", "noopener");
        toast.success("Impersonation link opened in a new tab");
      } else {
        toast.error("No link returned");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const bulk = async (action: "disable" | "enable" | "viewer") => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Apply "${action}" to ${ids.length} user(s)?`)) return;
    setBusy(true);
    try {
      for (const id of ids) {
        if (action === "viewer") await call({ action: "setRole", userId: id, role: "viewer" });
        else await call({ action: "setDisabled", userId: id, disabled: action === "disable" });
      }
      toast.success("Bulk action complete");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Bulk action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Role &amp; Access Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage platform roles, organization access, and account status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = !showAudit;
              setShowAudit(next);
              if (next) loadAudit();
            }}
          >
            <ScrollText className="h-4 w-4 mr-2" /> Audit log
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {showAudit ? (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Role &amp; permission audit log</h2>
          </div>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">No changes recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{a.actor_email ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.action}</Badge></TableCell>
                    <TableCell className="text-sm">{a.target_email ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.details && Object.keys(a.details).length ? JSON.stringify(a.details) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="org_admin">Organization Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <Card className="p-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("disable")}>
                <Ban className="h-4 w-4 mr-1" /> Disable
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("enable")}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Enable
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("viewer")}>
                <UserRound className="h-4 w-4 mr-1" /> Set as Viewer
              </Button>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading users…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users match.</TableCell></TableRow>
                ) : (
                  filtered.map((u) => {
                    const role = platformRole(u);
                    const meta = ROLE_META[role];
                    const isSelf = u.id === user?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(u.id)}
                            onCheckedChange={() => toggleOne(u.id)}
                            aria-label="Select row"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{u.email ?? "—"}{isSelf && <span className="text-xs text-muted-foreground"> (you)</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{primaryOrg(u)}</TableCell>
                        <TableCell><Badge className={meta.cls}>{meta.label}</Badge></TableCell>
                        <TableCell>
                          {u.disabled
                            ? <Badge variant="outline" className="text-destructive border-destructive/40">Disabled</Badge>
                            : <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>{u.email}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setProfileTarget(u)}>
                                <UserRound className="h-4 w-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRole(u)}>
                                <UserCog className="h-4 w-4 mr-2" /> Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAssign(u)}>
                                <Building2 className="h-4 w-4 mr-2" /> Assign Organization
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleDisabled(u)} disabled={isSelf}>
                                {u.disabled
                                  ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Enable Account</>
                                  : <><Ban className="h-4 w-4 mr-2" /> Disable Account</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => resetPassword(u)}>
                                <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => impersonate(u)} disabled={isSelf}>
                                <LogIn className="h-4 w-4 mr-2" /> Impersonate User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteUser(u)}
                                disabled={isSelf}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Change Role dialog */}
      <Dialog open={!!roleTarget} onOpenChange={(o) => !o && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>{roleTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Platform role</Label>
              <Select value={roleValue} onValueChange={(v) => setRoleValue(v as PlatformRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="org_admin">Organization Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(roleValue === "org_admin" || roleValue === "staff") && (
              <div>
                <Label>Organization</Label>
                <Select value={roleOrg} onValueChange={setRoleOrg}>
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {roleValue === "super_admin" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Full platform-wide access to every organization and setting.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button onClick={submitRole} disabled={busy} className="shadow-court">Save role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Organization dialog */}
      <Dialog open={!!orgTarget} onOpenChange={(o) => !o && setOrgTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign organization</DialogTitle>
            <DialogDescription>{orgTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Organization</Label>
              <Select value={assignOrg} onValueChange={setAssignOrg}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Membership role</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="referee">Referee</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgTarget(null)}>Cancel</Button>
            <Button onClick={submitAssign} disabled={busy} className="shadow-court">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Profile dialog */}
      <Dialog open={!!profileTarget} onOpenChange={(o) => !o && setProfileTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{profileTarget?.name ?? profileTarget?.email}</DialogTitle>
            <DialogDescription>{profileTarget?.email}</DialogDescription>
          </DialogHeader>
          {profileTarget && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Role</span>
                <Badge className={ROLE_META[platformRole(profileTarget)].cls}>{ROLE_META[platformRole(profileTarget)].label}</Badge>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <span>{profileTarget.disabled ? "Disabled" : "Active"}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Joined</span>
                <span>{new Date(profileTarget.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last active</span>
                <span>{profileTarget.last_sign_in_at ? new Date(profileTarget.last_sign_in_at).toLocaleString() : "Never"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Organizations</span>
                {profileTarget.memberships.length === 0 ? (
                  <p className="text-muted-foreground mt-1">None</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {profileTarget.memberships.map((m) => (
                      <li key={m.organization_id} className="flex items-center justify-between">
                        <span>{m.organization_name}</span>
                        <Badge variant="secondary" className="capitalize text-[10px]">{m.role}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
