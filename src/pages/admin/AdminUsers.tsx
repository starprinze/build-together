import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, RefreshCw, UserPlus } from "lucide-react";

interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list", page: 1, perPage: 200 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setUsers((data as any).users ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const callRole = async (action: "grant" | "revoke", email: string) => {
    if (!email.trim()) {
      toast.error("Enter an email");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action, email: email.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(action === "grant" ? "Admin granted" : "Admin revoked");
      setGrantEmail("");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            View accounts and grant or revoke the admin role.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Grant admin by email</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Label htmlFor="grant-email" className="sr-only">Email</Label>
            <Input
              id="grant-email"
              type="email"
              placeholder="user@example.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={() => callRole("grant", grantEmail)}
            disabled={busy}
            className="shadow-court"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            Grant admin
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The user must have an existing account.
        </p>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Loading users…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    {u.is_admin ? (
                      <Badge className="bg-primary text-primary-foreground">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.is_admin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || !u.email}
                        onClick={() => u.email && callRole("revoke", u.email)}
                      >
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy || !u.email}
                        onClick={() => u.email && callRole("grant", u.email)}
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Make admin
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
