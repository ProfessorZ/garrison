import { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { serversApi } from "../api/servers";
import { dashboardApi } from "../api/dashboard";
import CommandPalette from "./CommandPalette";
import AddServerModal from "./AddServerModal";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "#e3b454",
  ADMIN: "#d96b5c",
  MODERATOR: "#67b7e2",
  VIEWER: "#8a8271",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showAddServer, setShowAddServer] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000,
  });

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const navItems = useMemo(
    () => [
      { path: "/", label: "Fleet", match: (p: string) => p === "/" || p.startsWith("/server/") },
      { path: "/players", label: "Players", match: (p: string) => p.startsWith("/players") },
      { path: "/ban-lists", label: "Bans", match: (p: string) => p.startsWith("/ban-lists") },
      {
        path: "/scheduler",
        label: "Automation",
        match: (p: string) => p.startsWith("/scheduler") || p.startsWith("/triggers"),
      },
      ...(isAdmin
        ? [
            { path: "/discord", label: "Discord", match: (p: string) => p.startsWith("/discord") },
            {
              path: "/plugins",
              label: "System",
              match: (p: string) => p.startsWith("/plugins") || p.startsWith("/users"),
            },
          ]
        : []),
      { path: "/activity", label: "Log", match: (p: string) => p.startsWith("/activity") },
    ],
    [isAdmin]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const initials = (user?.username || "?").slice(0, 2).toUpperCase();
  const onlineCount = stats?.online_servers ?? servers.length;
  const playerCount = stats?.total_players ?? 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-deepest)" }}>
      <div className="scanlines" aria-hidden />

      <header
        className="sticky top-0 z-50 flex items-center flex-wrap gap-x-5 gap-y-3 px-4 sm:px-6 py-3"
        style={{
          borderBottom: "1px solid rgba(255,178,36,0.12)",
          background: "var(--bg-card)",
        }}
      >
        <Link
          to="/"
          className="font-mono font-semibold text-sm tracking-[0.18em] shrink-0"
          style={{ color: "var(--accent)", textShadow: "0 0 14px rgba(255,178,36,0.35)" }}
        >
          GARRISON<span style={{ color: "var(--text-dim)" }}>_OPS</span>
        </Link>

        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden sm:flex flex-1 min-w-[180px] max-w-[440px] items-center gap-2.5 px-3.5 py-2 text-left touch-compact"
          style={{
            border: "1px solid var(--border-accent)",
            borderRadius: 6,
            background: "var(--bg-elevated)",
            minHeight: "unset",
          }}
        >
          <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>
            ⌘K
          </span>
          <span className="font-mono text-xs truncate" style={{ color: "var(--text-muted)" }}>
            run command, jump anywhere…
          </span>
        </button>

        <div className="hidden md:flex gap-4 font-mono text-[11px] whitespace-nowrap shrink-0">
          <span style={{ color: "var(--success)" }}>▲ {onlineCount} UP</span>
          <span style={{ color: "var(--text-primary)" }}>{playerCount} PLAYERS</span>
        </div>

        <nav className="hidden lg:flex gap-1 font-medium text-[13px] flex-wrap">
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="px-3 py-1.5 rounded-[5px] transition-colors"
                style={{
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  background: active ? "var(--accent-glow)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="sm:hidden font-mono text-[10px] px-2 py-1.5 touch-compact"
            style={{
              border: "1px solid var(--border-accent)",
              borderRadius: 5,
              color: "var(--accent)",
              minHeight: "unset",
            }}
          >
            ⌘K
          </button>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden p-1.5 touch-compact"
            style={{ color: "var(--text-secondary)", minHeight: "unset" }}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title="Sign out"
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 touch-compact"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              minHeight: "unset",
            }}
          >
            <span
              className="w-[22px] h-[22px] rounded-[5px] font-mono text-[10px] font-semibold flex items-center justify-center"
              style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
            >
              {initials}
            </span>
            <span
              className="font-mono text-[10px]"
              style={{ color: ROLE_COLORS[user?.role || ""] || "var(--text-secondary)" }}
            >
              {user?.role || "OPS"}
            </span>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="lg:hidden px-4 py-3 flex flex-col gap-1 z-40"
          style={{
            background: "var(--bg-card)",
            borderBottom: "1px solid rgba(255,178,36,0.12)",
          }}
        >
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="px-3 py-2.5 rounded-md text-sm font-medium"
                style={{
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  background: active ? "var(--accent-glow)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-2 text-left px-3 py-2.5 font-mono text-xs"
            style={{ color: "var(--danger)" }}
          >
            SIGN OUT · {user?.username}
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAddServer={() => setShowAddServer(true)}
        isAdmin={isAdmin}
      />
      <AddServerModal open={showAddServer} onClose={() => setShowAddServer(false)} />
    </div>
  );
}
