import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  Pause,
  Play,
  Trash2,
  Clock,
  ChevronDown,
  Edit3,
  Check,
  Package,
} from "lucide-react";
import { schedulesApi } from "../api/schedules";
import type { ScheduledCommand } from "../types";

const CRON_PATTERNS: { label: string; value: string; description: string }[] = [
  { label: "Every 5 min", value: "*/5 * * * *", description: "Runs every 5 minutes" },
  { label: "Every 15 min", value: "*/15 * * * *", description: "Runs every 15 minutes" },
  { label: "Every 30 min", value: "*/30 * * * *", description: "Runs every 30 minutes" },
  { label: "Hourly", value: "0 * * * *", description: "Runs at the top of every hour" },
  { label: "Every 6h", value: "0 */6 * * *", description: "Runs every 6 hours" },
  { label: "Midnight", value: "0 0 * * *", description: "Runs daily at 00:00" },
  { label: "4 AM", value: "0 4 * * *", description: "Runs daily at 04:00" },
  { label: "Noon", value: "0 12 * * *", description: "Runs daily at 12:00" },
];

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  if (mon !== "*" || dow !== "*" || dom !== "*") {
    const match = CRON_PATTERNS.find((p) => p.value === expr);
    return match?.description || expr;
  }
  if (min.startsWith("*/") && hour === "*") return `Every ${min.slice(2)} minutes`;
  if (min === "0" && hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  if (min === "0" && hour === "*") return "Every hour";
  if (min !== "*" && hour !== "*" && !hour.includes("/") && !min.includes("/")) {
    const h = parseInt(hour);
    const m = parseInt(min);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `Daily at ${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  const match = CRON_PATTERNS.find((p) => p.value === expr);
  return match?.description || expr;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeUntil(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "Overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "< 1m";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

interface Props { serverId: number; }

export default function ScheduleManager({ serverId }: Props) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", command: "", cron_expression: "" });
  const [editForm, setEditForm] = useState({ name: "", command: "", cron_expression: "" });

  const queryKey = ["schedules", serverId];

  const { data: schedules = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => schedulesApi.list(serverId),
  });

  const { data: presets = [] } = useQuery({
    queryKey: ["schedule-presets", serverId],
    queryFn: () => schedulesApi.getPresets(serverId),
    enabled: showPresets,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; command: string; cron_expression: string }) =>
      schedulesApi.create(serverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowAdd(false);
      setForm({ name: "", command: "", cron_expression: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ScheduledCommand> }) =>
      schedulesApi.update(serverId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => schedulesApi.delete(serverId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const presetMutation = useMutation({
    mutationFn: (index: number) => schedulesApi.applyPreset(serverId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowPresets(false);
    },
  });

  const handleCreate = (e: FormEvent) => { e.preventDefault(); createMutation.mutate(form); };

  const startEdit = (cmd: ScheduledCommand) => {
    setEditingId(cmd.id);
    setEditForm({ name: cmd.name, command: cmd.command, cron_expression: cmd.cron_expression });
  };

  const saveEdit = (id: number) => updateMutation.mutate({ id, data: editForm });

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">
          Scheduled Commands
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Package className="h-3 w-3" /> Presets <ChevronDown className="h-3 w-3" />
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-xl shadow-2xl z-10 py-1"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => presetMutation.mutate(idx)}
                    disabled={presetMutation.isPending}
                    className="w-full text-left px-4 py-2.5 transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="text-sm font-semibold text-[#e2e8f0]">{preset.name}</div>
                    <div className="text-xs text-[#64748b] mt-0.5">
                      {preset.description} ({preset.commands.length} command{preset.commands.length !== 1 ? "s" : ""})
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowPresets(false); }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150"
            style={showAdd
              ? { background: "#1a1f2e", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.06)" }
              : { background: "#00d4aa", color: "#0a0e1a", border: "none" }
            }
          >
            {showAdd ? <><X className="h-3 w-3" /> Cancel</> : <><Plus className="h-3 w-3" /> Add Schedule</>}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="rounded-xl p-5 animate-fade-in"
          style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] mb-1 uppercase tracking-wider">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Auto Save" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] mb-1 uppercase tracking-wider">Command</label>
              <input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} required placeholder="save" className={inputCls} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] mb-1 uppercase tracking-wider">Cron</label>
              <input value={form.cron_expression} onChange={(e) => setForm({ ...form, cron_expression: e.target.value })} required placeholder="*/30 * * * *" className={inputCls} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
              {form.cron_expression && (
                <p className="text-xs text-[#00d4aa] mt-1 opacity-70">{describeCron(form.cron_expression)}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {CRON_PATTERNS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, cron_expression: p.value })}
                className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150"
                style={{
                  background: form.cron_expression === p.value ? "#00d4aa" : "#1a1f2e",
                  color: form.cron_expression === p.value ? "#0a0e1a" : "#94a3b8",
                  border: `1px solid ${form.cron_expression === p.value ? "#00d4aa" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button type="submit" disabled={createMutation.isPending}
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
              style={{ background: "#00d4aa" }}>
              {createMutation.isPending ? "Adding..." : "Add Schedule"}
            </button>
            {createMutation.isError && <span className="text-xs text-[#ff4757]">Failed to create schedule</span>}
          </div>
        </form>
      )}

      {/* Schedule list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Clock className="h-8 w-8 text-[#1a1f2e] mx-auto mb-2" />
          <p className="text-sm text-[#94a3b8]">No scheduled commands yet</p>
          <p className="text-xs text-[#64748b] mt-1">Add a schedule or apply a preset</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Name", "Command", "Schedule", "Last Run", "Next Run", "Runs", "Actions"].map((h, i) => (
                  <th key={h} className={`${i === 6 ? "text-right" : "text-left"} px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.map((cmd) => (
                <tr key={cmd.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  {editingId === cmd.id ? (
                    <>
                      <td className="px-4 py-2"><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-md px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none" style={inputStyle} /></td>
                      <td className="px-4 py-2"><input value={editForm.command} onChange={(e) => setEditForm({ ...editForm, command: e.target.value })} className="w-full rounded-md px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} /></td>
                      <td className="px-4 py-2"><input value={editForm.cron_expression} onChange={(e) => setEditForm({ ...editForm, cron_expression: e.target.value })} className="w-full rounded-md px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} /></td>
                      <td colSpan={3} />
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => saveEdit(cmd.id)} disabled={updateMutation.isPending} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[#0a0e1a] mr-1" style={{ background: "#00d4aa" }}>
                          <Check className="h-3 w-3" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="inline-flex items-center rounded-md px-2 py-1 text-xs text-[#e2e8f0]" style={{ background: "#1a1f2e" }}>
                          <X className="h-3 w-3" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${cmd.is_active ? "bg-[#00d4aa] status-online" : "bg-[#64748b]"}`} />
                          <span className="text-sm text-[#e2e8f0] font-medium">{cmd.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#94a3b8] max-w-[200px] truncate" style={{ fontFamily: "var(--font-mono)" }}>{cmd.command}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs text-[#94a3b8]" style={{ fontFamily: "var(--font-mono)" }}>{cmd.cron_expression}</div>
                        <div className="text-[11px] text-[#64748b]">{describeCron(cmd.cron_expression)}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#64748b]">{timeAgo(cmd.last_run)}</td>
                      <td className="px-4 py-2.5 text-xs text-[#64748b]">{cmd.is_active ? timeUntil(cmd.next_run) : "\u2014"}</td>
                      <td className="px-4 py-2.5 text-xs text-[#64748b]" style={{ fontFamily: "var(--font-mono)" }}>{cmd.run_count}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => updateMutation.mutate({ id: cmd.id, data: { is_active: !cmd.is_active } })}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#e2e8f0] transition-all duration-150"
                            style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                            title={cmd.is_active ? "Pause" : "Resume"}>
                            {cmd.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </button>
                          <button onClick={() => startEdit(cmd)}
                            className="inline-flex items-center rounded-md px-2 py-1 text-xs text-[#e2e8f0] transition-all duration-150"
                            style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                            title="Edit">
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button onClick={() => { if (confirm("Delete this schedule?")) deleteMutation.mutate(cmd.id); }}
                            className="inline-flex items-center rounded-md px-2 py-1 text-xs text-[#ff4757] transition-all duration-150"
                            style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.12)" }}
                            title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Last result preview */}
      {schedules.some((s) => s.last_result) && (
        <details className="rounded-xl" style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <summary className="px-4 py-2.5 text-xs font-bold text-[#64748b] cursor-pointer hover:text-[#94a3b8] uppercase tracking-wider">
            Last execution results
          </summary>
          <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {schedules.filter((s) => s.last_result).map((s) => (
              <div key={s.id}>
                <span className="text-xs font-bold text-[#e2e8f0]">{s.name}:</span>
                <pre className="text-xs text-[#64748b] mt-0.5 whitespace-pre-wrap break-all" style={{ fontFamily: "var(--font-mono)" }}>
                  {s.last_result}
                </pre>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
