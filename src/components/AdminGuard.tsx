import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-display font-bold mb-2">Organizer access only</h1>
        <p className="text-muted-foreground">This control center is only available to approved organizers.</p>
      </div>
    );
  }
  return <>{children}</>;
}
