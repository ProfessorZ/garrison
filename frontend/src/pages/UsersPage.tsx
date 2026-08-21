import { Navigate } from "react-router-dom";

/** Operators live under System — keep route for bookmarks. */
export default function UsersPage() {
  return <Navigate to="/plugins?tab=operators" replace />;
}
