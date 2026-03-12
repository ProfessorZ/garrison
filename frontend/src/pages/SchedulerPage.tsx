import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Pause, Play, Trash2, Clock } from "lucide-react";
import { serversApi } from "../api/servers";
import { schedulesApi } from "../api/schedules";

export default function SchedulerPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    server_id: "",
    name: "",
    command: "",
    cron_expression: "",
  });

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
  });

  const { data: allCommands = [] } = useQuery({
    queryKey: ["all-schedules", servers.map((s) => s.id)],
    queryFn: async () => {
      const results = await Promise.all(
        servers.map((s) => schedulesApi.list(s.id).catch(() => []))
      );
      return results.flat();
    },
    enabled: servers.length > 0,
  });

  const createCommand = useMutation({
    mutationFn: (data: { server_id: number; name: string; command: string; cron_expression: string }) =>
      schedulesApi.create(data.server_id, {
        name: data.name,
        command: data.command,
        cron_expression: data.cron_expression,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-schedules"] });
      setShowAdd(false);
      setForm({ server_id: "", name: "", command: "", cron_expression: "" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, server_id, is_active }: { id: number; server_id: number; is_active: boolean }) =>
      schedulesApi.update(server_id, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-schedules"] }),
  });

  const deleteCommand = useMutation({
    mutationFn: ({ id, server_id }: { id: number; server_id: number }) =>
      schedulesApi.delete(server_id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-schedules"] }),
  });

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    createCommand.mutate({
      server_id: parseInt(form.server_id),
      name: form.name,
      command: form.command,
      cron_expression: form.cron_expression,
    });
  };

  const serverName = (id: number) =>
    servers.find((s) => s.id === id)?.name ?? `Server #${id}`;

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#e2e8f0]">Scheduled Commands</h2>
          <p className="text-sm text-[#64748b] mt-1">Automate recurring RCON commands across all servers</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-150"
          style={showAdd
            ? { background: "#1a1f2e", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.06)" }
            : { background: "#00d4aa", color: "#0a0e1a", border: "none" }
          }
        >
          {showAdd ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Job</>}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl p-6 mb-6 animate-fade-in"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-5 uppercase tracking-wider">New Scheduled Command</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] mb-1.5 uppercase tracking-wider">Server</label>
              <select value={form.server_id} onChange={(e) => setForm({ ...form, server_id: e.target.value })} required className={inputCls} style={inputStyle}>
                <option value="">Select server...</option>
                {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] mb-1.5 uppercase tracking-wider">Job Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputCls} style={inputStyle} placeholder="Daily restart" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] mb-1.5 uppercase tracking-wider">RCON Command</label>
              <input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} required className={inputCls} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} placeholder='servermsg "Restarting..."' />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] mb-1.5 uppercase tracking-wider">Cron Expression</label>
              <input value={form.cron_expression} onChange={(e) => setForm({ ...form, cron_expression: e.target.value })} required className={inputCls} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} placeholder="0 */6 * * *" />
            </div>
          </div>
          <button type="submit" disabled={createCommand.isPending}
            className="mt-5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
            style={{ background: "#00d4aa" }}>
            {createCommand.isPending ? "Adding..." : "Add Job"}
          </button>
        </form>
      )}

      {allCommands.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
          <p className="text-[#94a3b8] text-sm">No scheduled commands configured</p>
          <p className="text-xs text-[#64748b] mt-1">Create schedules per-server or add one here</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Name", "Server", "Command", "Schedule", "Status", "Runs", "Actions"].map((h, i) => (
                  <th key={h} className={`${i === 6 ? "text-right" : "text-left"} px-4 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allCommands.map((cmd) => (
                <tr key={`${cmd.server_id}-${cmd.id}`}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3 text-sm text-[#e2e8f0] font-medium">{cmd.name}</td>
                  <td className="px-4 py-3 text-sm text-[#94a3b8]">{serverName(cmd.server_id)}</td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8] max-w-[200px] truncate" style={{ fontFamily: "var(--font-mono)" }}>{cmd.command}</td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]" style={{ fontFamily: "var(--font-mono)" }}>{cmd.cron_expression}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                      style={{
                        background: cmd.is_active ? "rgba(0,212,170,0.08)" : "#1a1f2e",
                        color: cmd.is_active ? "#00d4aa" : "#64748b",
                      }}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cmd.is_active ? "bg-[#00d4aa]" : "bg-[#64748b]"}`} />
                      {cmd.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748b]" style={{ fontFamily: "var(--font-mono)" }}>{cmd.run_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => toggleActive.mutate({ id: cmd.id, server_id: cmd.server_id, is_active: !cmd.is_active })}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
                        style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {cmd.is_active ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
                      </button>
                      <button onClick={() => { if (confirm("Delete this scheduled command?")) deleteCommand.mutate({ id: cmd.id, server_id: cmd.server_id }); }}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#ff4757] transition-all duration-150"
                        style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.12)" }}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
