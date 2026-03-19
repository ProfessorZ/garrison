import { useState, useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Clock,
  LogOut,
  Shield,
  Activity,
  Server,
  Menu,
  X,
  Users,
  Database,
  Bell,
  List,
  Zap,
  Puzzle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { serversApi } from "../api/servers";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-amber-400",
  ADMIN: "text-red-400",
  MODERATOR: "text-blue-400",
  VIEWER: "text-[#64748b]",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
  });

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const navItems = useMemo(
    () => [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/players", label: "Players", icon: Database },
      { path: "/ban-lists", label: "Ban Lists", icon: List },
      { path: "/activity", label: "Activity", icon: Activity },
      { path: "/scheduler", label: "Scheduler", icon: Clock },
      ...(isAdmin
        ? [
            { path: "/triggers", label: "Triggers", icon: Zap },
            { path: "/discord", label: "Discord", icon: Bell },
            { path: "/plugins", label: "Plugins", icon: Puzzle },
            { path: "/users", label: "Users", icon: Users },
          ]
        : []),
    ],
    [isAdmin]
  );

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen" style={{ background: "#0a0e1a" }}>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 md:hidden"
        style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-md text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          style={{ background: "transparent" }}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="text-sm font-extrabold tracking-[0.15em] uppercase gradient-text">
          Garrison
        </span>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 flex flex-col shrink-0 transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#111827", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link to="/" className="block" onClick={closeSidebar}>
            <h1 className="text-base font-extrabold tracking-[0.2em] uppercase gradient-text">
              Garrison
            </h1>
            <p className="text-[11px] mt-1 text-[#64748b] font-medium">
              Server Command Center
            </p>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm md:text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "text-[#00d4aa]"
                    : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
                style={active ? {
                  borderLeft: "2px solid #00d4aa",
                  marginLeft: "-2px",
                  paddingLeft: "calc(0.75rem + 2px)",
                } : { borderLeft: "2px solid transparent", marginLeft: "-2px", paddingLeft: "calc(0.75rem + 2px)" }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Server list */}
          {servers.length > 0 && (
            <>
              <div className="my-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">
                Servers
              </p>
              {servers.map((s) => {
                const active = location.pathname === `/server/${s.id}`;
                return (
                  <Link
                    key={s.id}
                    to={`/server/${s.id}`}
                    onClick={closeSidebar}
                    className={`flex items-center gap-2 px-3 py-2.5 md:py-1.5 rounded-md text-sm md:text-[13px] transition-all duration-150 ${
                      active
                        ? "text-[#00d4aa]"
                        : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                    style={active ? {
                      borderLeft: "2px solid #00d4aa",
                      marginLeft: "-2px",
                      paddingLeft: "calc(0.75rem + 2px)",
                    } : { borderLeft: "2px solid transparent", marginLeft: "-2px", paddingLeft: "calc(0.75rem + 2px)" }}
                  >
                    <Server className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* User section */}
        <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-[#e2e8f0]"
              style={{ background: "#1a1f2e" }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#e2e8f0] truncate">
                {user?.username}
              </p>
              {user?.role && (
                <p className={`flex items-center gap-1 text-[11px] font-medium ${ROLE_COLORS[user.role] || "text-[#64748b]"}`}>
                  <Shield className="h-3 w-3" />
                  {user.role}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full rounded-md px-3 py-1.5 text-xs font-medium text-[#94a3b8] hover:text-[#e2e8f0] transition-all duration-150"
            style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
