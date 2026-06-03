import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Restricts a route to the platform super administrator only.
 * Use for global governance pages (organizations, users, platform settings).
 */
export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) {
    return <div className="container py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isSuperAdmin) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-display font-bold mb-2">Super admin only</h1>
        <p className="text-muted-foreground">This area is reserved for platform administrators.</p>
      </div>
    );
  }
  return <>{children}</>;
}
