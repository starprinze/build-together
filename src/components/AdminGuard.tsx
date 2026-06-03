import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, canManage, loading } = useAuth();
  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!canManage) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-display font-bold mb-2">Organizer access only</h1>
        <p className="text-muted-foreground">This control center is only available to approved organizers.</p>
      </div>
    );
  }
  return <>{children}</>;
}
