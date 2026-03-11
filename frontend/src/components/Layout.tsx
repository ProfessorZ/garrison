import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface Props {
  user: { username: string; is_admin: boolean };
  onLogout: () => void;
  children: ReactNode;
}

export default function Layout({ user, onLogout, children }: Props) {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/scheduler", label: "Scheduler" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 220,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          padding: "20px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>Garrison</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>RCON Dashboard</p>
        </div>
        <div style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "block",
                padding: "8px 12px",
                borderRadius: 6,
                marginBottom: 4,
                color: location.pathname === item.path ? "var(--accent)" : "var(--text-secondary)",
                background: location.pathname === item.path ? "var(--bg-tertiary)" : "transparent",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
            {user.username} {user.is_admin && <span style={{ color: "var(--warning)", fontSize: 11 }}>ADMIN</span>}
          </p>
          <button className="btn-secondary" style={{ width: "100%", fontSize: 13 }} onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>{children}</main>
    </div>
  );
}
