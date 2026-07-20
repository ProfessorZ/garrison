import { Navigate } from "react-router-dom";

/** Triggers live under Automation — keep route for bookmarks. */
export default function TriggersPage() {
  return <Navigate to="/scheduler?tab=triggers" replace />;
}
