import { useState, useEffect, FormEvent } from "react";
import { useApi } from "../hooks/useApi";

interface Server {
  id: number;
  name: string;
}

interface ScheduledCommand {
  id: number;
  server_id: number;
  name: string;
  command: string;
  cron_expression: string;
  is_active: boolean;
}

export default function SchedulerPage({ token }: { token: string | null }) {
  const { apiFetch } = useApi(token);
  const [commands, setCommands] = useState<ScheduledCommand[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ server_id: "", name: "", command: "", cron_expression: "" });

  const load = async () => {
    const [cmds, srvs] = await Promise.all([
      apiFetch("/api/scheduled-commands/"),
      apiFetch("/api/servers/"),
    ]);
    setCommands(cmds);
    setServers(srvs);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch("/api/scheduled-commands/", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        server_id: parseInt(form.server_id),
      }),
    });
    setShowAdd(false);
    setForm({ server_id: "", name: "", command: "", cron_expression: "" });
    load();
  };

  const toggleActive = async (cmd: ScheduledCommand) => {
    await apiFetch(`/api/scheduled-commands/${cmd.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_active: !cmd.is_active }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this scheduled command?")) return;
    await apiFetch(`/api/scheduled-commands/${id}`, { method: "DELETE" });
    load();
  };

  const serverName = (id: number) => servers.find((s) => s.id === id)?.name ?? `Server #${id}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Scheduled Commands</h2>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ Add Job"}
        </button>
      </div>

      {showAdd && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Server</label>
              <select value={form.server_id} onChange={(e) => setForm({ ...form, server_id: e.target.value })} required>
                <option value="">Select server...</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Job Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>RCON Command</label>
              <input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cron Expression (min hr day mon dow)</label>
              <input
                value={form.cron_expression}
                onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                placeholder="0 */6 * * *"
                required
              />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} type="submit">
            Add Job
          </button>
        </form>
      )}

      {commands.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No scheduled commands configured.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: 10, color: "var(--text-secondary)", fontSize: 13 }}>Name</th>
              <th style={{ textAlign: "left", padding: 10, color: "var(--text-secondary)", fontSize: 13 }}>Server</th>
              <th style={{ textAlign: "left", padding: 10, color: "var(--text-secondary)", fontSize: 13 }}>Command</th>
              <th style={{ textAlign: "left", padding: 10, color: "var(--text-secondary)", fontSize: 13 }}>Schedule</th>
              <th style={{ textAlign: "left", padding: 10, color: "var(--text-secondary)", fontSize: 13 }}>Status</th>
              <th style={{ textAlign: "right", padding: 10, color: "var(--text-secondary)", fontSize: 13 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commands.map((cmd) => (
              <tr key={cmd.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: 10, fontSize: 14 }}>{cmd.name}</td>
                <td style={{ padding: 10, fontSize: 14, color: "var(--text-secondary)" }}>{serverName(cmd.server_id)}</td>
                <td style={{ padding: 10, fontSize: 13, fontFamily: "monospace", color: "var(--text-secondary)" }}>{cmd.command}</td>
                <td style={{ padding: 10, fontSize: 13, fontFamily: "monospace", color: "var(--text-secondary)" }}>{cmd.cron_expression}</td>
                <td style={{ padding: 10 }}>
                  <span className={`badge ${cmd.is_active ? "badge-online" : "badge-offline"}`}>
                    {cmd.is_active ? "Active" : "Paused"}
                  </span>
                </td>
                <td style={{ padding: 10, textAlign: "right" }}>
                  <button className="btn-secondary" style={{ fontSize: 12, marginRight: 6 }} onClick={() => toggleActive(cmd)}>
                    {cmd.is_active ? "Pause" : "Resume"}
                  </button>
                  <button className="btn-danger" style={{ fontSize: 12 }} onClick={() => handleDelete(cmd.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
