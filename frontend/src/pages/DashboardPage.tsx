import { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";

interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  rcon_port: number;
  game_type: string;
}

interface StatusMap {
  [id: number]: { online: boolean; player_count: number | null } | null;
}

export default function DashboardPage({ token }: { token: string | null }) {
  const { apiFetch } = useApi(token);
  const [servers, setServers] = useState<Server[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", host: "", port: "", rcon_port: "", rcon_password: "", game_type: "zomboid" });

  const loadServers = async () => {
    const data = await apiFetch("/api/servers/");
    setServers(data);
  };

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    servers.forEach(async (s) => {
      try {
        const st = await apiFetch(`/api/servers/${s.id}/status`);
        setStatuses((prev) => ({ ...prev, [s.id]: st }));
      } catch {
        setStatuses((prev) => ({ ...prev, [s.id]: { online: false, player_count: null } }));
      }
    });
  }, [servers]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch("/api/servers/", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        port: parseInt(form.port),
        rcon_port: parseInt(form.rcon_port),
      }),
    });
    setShowAdd(false);
    setForm({ name: "", host: "", port: "", rcon_port: "", rcon_password: "", game_type: "zomboid" });
    loadServers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this server?")) return;
    await apiFetch(`/api/servers/${id}`, { method: "DELETE" });
    loadServers();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Servers</h2>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ Add Server"}
        </button>
      </div>

      {showAdd && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Host</label>
              <input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Game Port</label>
              <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>RCON Port</label>
              <input type="number" value={form.rcon_port} onChange={(e) => setForm({ ...form, rcon_port: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>RCON Password</label>
              <input type="password" value={form.rcon_password} onChange={(e) => setForm({ ...form, rcon_password: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Game Type</label>
              <select value={form.game_type} onChange={(e) => setForm({ ...form, game_type: e.target.value })}>
                <option value="zomboid">Project Zomboid</option>
              </select>
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} type="submit">
            Add Server
          </button>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {servers.map((s) => {
          const st = statuses[s.id];
          return (
            <div key={s.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <Link to={`/server/${s.id}`} style={{ fontSize: 16, fontWeight: 600 }}>
                    {s.name}
                  </Link>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {s.host}:{s.port} &middot; {s.game_type}
                  </p>
                </div>
                <span className={`badge ${st?.online ? "badge-online" : "badge-offline"}`}>
                  {st === undefined ? "..." : st?.online ? "Online" : "Offline"}
                </span>
              </div>
              {st?.online && st.player_count !== null && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
                  {st.player_count} player{st.player_count !== 1 ? "s" : ""} online
                </p>
              )}
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <Link to={`/server/${s.id}`}>
                  <button className="btn-secondary" style={{ fontSize: 13 }}>Manage</button>
                </Link>
                <button className="btn-danger" style={{ fontSize: 13 }} onClick={() => handleDelete(s.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {servers.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No servers configured. Click &quot;+ Add Server&quot; to get started.</p>
        )}
      </div>
    </div>
  );
}
