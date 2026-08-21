import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ADMIN_PREFIXES = ["/plugins", "/users", "/triggers", "/discord"];

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0b0a08" }}>
        <div className="text-center animate-fade-in">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
          <p className="mt-4 font-mono text-sm" style={{ color: "var(--text-muted)" }}>
            initializing…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const needsAdmin =
    adminOnly || ADMIN_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  if (needsAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
