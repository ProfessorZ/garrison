import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Clock,
  LogOut,
  Shield,
  Terminal,
  Activity,
  Server,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { serversApi } from "../api/servers";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/activity", label: "Activity", icon: Activity },
  { path: "/scheduler", label: "Scheduler", icon: Clock },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
  });

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-slate-800 border-b border-slate-700 px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500">Garrison</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed md:static inset-y-0 left-0 z-50 w-56 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 transition-transform md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2" onClick={closeSidebar}>
            <Terminal className="h-5 w-5 text-emerald-500" />
            <h1 className="text-lg font-bold text-emerald-500">Garrison</h1>
          </Link>
          <p className="text-xs text-slate-500 mt-1">RCON Dashboard</p>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Separator + server list */}
          {servers.length > 0 && (
            <>
              <div className="my-3 border-t border-slate-700" />
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Servers
              </p>
              {servers.map((s) => {
                const active = location.pathname === `/server/${s.id}`;
                return (
                  <Link
                    key={s.id}
                    to={`/server/${s.id}`}
                    onClick={closeSidebar}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Server className="h-3.5 w-3.5" />
                    <span className="truncate">{s.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* User section */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-300 truncate">
                {user?.username}
              </p>
              {user?.is_admin && (
                <p className="flex items-center gap-1 text-xs text-amber-500">
                  <Shield className="h-3 w-3" />
                  Admin
                </p>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto pt-16 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
