import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Trash2, Clock } from "lucide-react";
import { serversApi } from "../api/servers";
import { schedulesApi } from "../api/schedules";
import TriggerManager from "../components/TriggerManager";
import { useAuth } from "../contexts/AuthContext";

const CRON_PRESETS = [
  { label: "Every 30 min", value: "*/30 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Every 6h", value: "0 */6 * * *" },
  { label: "Daily 04:00", value: "0 4 * * *" },
  { label: "Weekly Sun 03:00", value: "0 3 * * 0" },
];

export default function SchedulerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "triggers" && isAdmin ? "triggers" : "schedules";
  const setTab = (t: "schedules" | "triggers") => {
    setParams(t === "schedules" ? {} : { tab: t });
  };

  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    server_id: "",
    name: "",
    command: "",
    cron_expression: "*/30 * * * *",
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
    enabled: servers.length > 0 && tab === "schedules",
  });

  const createCommand = useMutation({
    mutationFn: (data: {
      server_id: number;
      name: string;
      command: string;
      cron_expression: string;
    }) =>
      schedulesApi.create(data.server_id, {
        name: data.name,
        command: data.command,
        cron_expression: data.cron_expression,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-schedules"] });
      setShowAdd(false);
      setForm({ server_id: "", name: "", command: "", cron_expression: "*/30 * * * *" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({
      id,
      server_id,
      is_active,
    }: {
      id: number;
      server_id: number;
      is_active: boolean;
    }) => schedulesApi.update(server_id, id, { is_active }),
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

  const field = {
    background: "var(--bg-deepest)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[26px] font-bold" style={{ color: "var(--text-primary)" }}>
            Automation
          </h1>
          <p className="font-mono text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            schedules run on cron · triggers react to events · everything logs to the live tail
          </p>
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ["schedules", "SCHEDULES"],
              ...(isAdmin ? [["triggers", "TRIGGERS"] as const] : []),
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="font-mono text-[10px] font-semibold tracking-widest px-3 py-1.5 touch-compact"
              style={{
                color: tab === key ? "#0b0a08" : "var(--text-secondary)",
                background: tab === key ? "var(--accent)" : "transparent",
                border: tab === key ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                minHeight: "unset",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "triggers" ? (
        <div
          className="rounded-lg p-5"
          style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <TriggerManager />
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className={showAdd ? "btn-ghost" : "btn-accent"}
            >
              {showAdd ? "CANCEL" : "+ SCHEDULE"}
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={handleAdd}
              className="rounded-lg p-5 mb-4 animate-fade-in"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)" }}
            >
              <p className="font-mono text-[10px] tracking-widest mb-4" style={{ color: "var(--accent)" }}>
                NEW SCHEDULE
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="label-caps block mb-1.5">Server</label>
                  <select
                    value={form.server_id}
                    onChange={(e) => setForm({ ...form, server_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-[12.5px]"
                    style={field}
                  >
                    <option value="">Select server…</option>
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-caps block mb-1.5">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-[12.5px]"
                    style={field}
                    placeholder="Auto Save"
                  />
                </div>
                <div>
                  <label className="label-caps block mb-1.5">RCON Command</label>
                  <input
                    value={form.command}
                    onChange={(e) => setForm({ ...form, command: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-[12.5px] font-mono"
                    style={field}
                    placeholder='save'
                  />
                </div>
                <div>
                  <label className="label-caps block mb-1.5">Cron</label>
                  <input
                    value={form.cron_expression}
                    onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-[12.5px] font-mono"
                    style={field}
                    placeholder="*/30 * * * *"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {CRON_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm({ ...form, cron_expression: p.value })}
                        className="font-mono text-[9px] px-2 py-1 touch-compact"
                        style={{
                          color: "var(--text-secondary)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 3,
                          minHeight: "unset",
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" disabled={createCommand.isPending} className="btn-primary mt-4 disabled:opacity-50">
                {createCommand.isPending ? "ADDING…" : "ADD JOB"}
              </button>
            </form>
          )}

          {allCommands.length === 0 ? (
            <div className="text-center py-16 rounded-lg" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Clock className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--text-dim)" }} />
              <p className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                no schedules configured
              </p>
            </div>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["NAME", "SERVER", "COMMAND", "CRON", "STATUS", "RUNS", ""].map((h) => (
                        <th
                          key={h || "a"}
                          className="text-left px-4 py-2.5 font-mono text-[9.5px] tracking-widest"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allCommands.map((cmd) => (
                      <tr
                        key={`${cmd.server_id}-${cmd.id}`}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      >
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {cmd.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                          {serverName(cmd.server_id)}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs max-w-[200px] truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {cmd.command}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                          {cmd.cron_expression}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-mono text-[10px]"
                            style={{ color: cmd.is_active ? "var(--success)" : "var(--text-muted)" }}
                          >
                            {cmd.is_active ? "● ACTIVE" : "○ PAUSED"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {cmd.run_count}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() =>
                              toggleActive.mutate({
                                id: cmd.id,
                                server_id: cmd.server_id,
                                is_active: !cmd.is_active,
                              })
                            }
                            className="font-mono text-[9.5px] px-2 py-1 mr-1 touch-compact"
                            style={{
                              color: "var(--text-secondary)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 3,
                              minHeight: "unset",
                            }}
                          >
                            {cmd.is_active ? (
                              <>
                                <Pause className="h-3 w-3 inline" /> PAUSE
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 inline" /> RESUME
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this schedule?"))
                                deleteCommand.mutate({ id: cmd.id, server_id: cmd.server_id });
                            }}
                            className="font-mono text-[9.5px] px-2 py-1 touch-compact"
                            style={{
                              color: "var(--danger)",
                              border: "1px solid rgba(217,107,92,0.3)",
                              borderRadius: 3,
                              minHeight: "unset",
                            }}
                          >
                            <Trash2 className="h-3 w-3 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
