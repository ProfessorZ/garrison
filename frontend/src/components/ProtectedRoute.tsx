import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0a0e1a" }}>
        <div className="text-center animate-fade-in">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
          <p className="mt-4 text-sm text-[#64748b]">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
