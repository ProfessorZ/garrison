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
import type { ScheduledCommand, SchedulePreset } from "../types";

// ── Cron helpers ────────────────────────────────────────────────────────────

const CRON_PATTERNS: { label: string; value: string; description: string }[] = [
  { label: "Every 5 minutes", value: "*/5 * * * *", description: "Runs every 5 minutes" },
  { label: "Every 15 minutes", value: "*/15 * * * *", description: "Runs every 15 minutes" },
  { label: "Every 30 minutes", value: "*/30 * * * *", description: "Runs every 30 minutes" },
  { label: "Every hour", value: "0 * * * *", description: "Runs at the top of every hour" },
  { label: "Every 6 hours", value: "0 */6 * * *", description: "Runs every 6 hours" },
  { label: "Daily at midnight", value: "0 0 * * *", description: "Runs daily at 00:00" },
  { label: "Daily at 4 AM", value: "0 4 * * *", description: "Runs daily at 04:00" },
  { label: "Daily at noon", value: "0 12 * * *", description: "Runs daily at 12:00" },
];

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  if (mon !== "*" || dow !== "*" || dom !== "*") {
    // Complex expressions - just show the pattern
    const match = CRON_PATTERNS.find((p) => p.value === expr);
    return match?.description || expr;
  }

  if (min.startsWith("*/") && hour === "*") {
    return `Every ${min.slice(2)} minutes`;
  }
  if (min === "0" && hour.startsWith("*/")) {
    return `Every ${hour.slice(2)} hours`;
  }
  if (min === "0" && hour === "*") {
    return "Every hour";
  }
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
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeUntil(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "< 1m";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  serverId: number;
}

export default function ScheduleManager({ serverId }: Props) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    command: "",
    cron_expression: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    command: "",
    cron_expression: "",
  });

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

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const startEdit = (cmd: ScheduledCommand) => {
    setEditingId(cmd.id);
    setEditForm({
      name: cmd.name,
      command: cmd.command,
      cron_expression: cmd.cron_expression,
    });
  };

  const saveEdit = (id: number) => {
    updateMutation.mutate({ id, data: editForm });
  };

  const inputClass =
    "w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          Scheduled Commands
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <Package className="h-3 w-3" />
              Presets
              <ChevronDown className="h-3 w-3" />
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 py-1">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => presetMutation.mutate(idx)}
                    disabled={presetMutation.isPending}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-200">
                      {preset.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {preset.description} ({preset.commands.length} command
                      {preset.commands.length !== 1 ? "s" : ""})
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowPresets(false); }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              showAdd
                ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {showAdd ? (
              <>
                <X className="h-3 w-3" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Add Schedule
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-800 border border-slate-700 rounded-lg p-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Auto Save"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Command
              </label>
              <input
                value={form.command}
                onChange={(e) => setForm({ ...form, command: e.target.value })}
                required
                placeholder="save"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Cron Expression
              </label>
              <input
                value={form.cron_expression}
                onChange={(e) =>
                  setForm({ ...form, cron_expression: e.target.value })
                }
                required
                placeholder="*/30 * * * *"
                className={`${inputClass} font-mono`}
              />
              {form.cron_expression && (
                <p className="text-xs text-emerald-400/70 mt-1">
                  {describeCron(form.cron_expression)}
                </p>
              )}
            </div>
          </div>

          {/* Cron quick-pick */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {CRON_PATTERNS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() =>
                  setForm({ ...form, cron_expression: p.value })
                }
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  form.cron_expression === p.value
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? "Adding..." : "Add Schedule"}
            </button>
            {createMutation.isError && (
              <span className="text-xs text-red-400">
                Failed to create schedule
              </span>
            )}
          </div>
        </form>
      )}

      {/* Schedule list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
          <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No scheduled commands yet.</p>
          <p className="text-xs text-slate-600 mt-1">
            Add a schedule or apply a preset to get started.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Name
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Command
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Schedule
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Last Run
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Next Run
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Runs
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((cmd) => (
                <tr
                  key={cmd.id}
                  className="border-b border-slate-700/50 last:border-0"
                >
                  {editingId === cmd.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full rounded bg-slate-700 border border-slate-600 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.command}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              command: e.target.value,
                            })
                          }
                          className="w-full rounded bg-slate-700 border border-slate-600 px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.cron_expression}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              cron_expression: e.target.value,
                            })
                          }
                          className="w-full rounded bg-slate-700 border border-slate-600 px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td colSpan={3} />
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => saveEdit(cmd.id)}
                          disabled={updateMutation.isPending}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 mr-1 transition-colors"
                        >
                          <Check className="h-3 w-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              cmd.is_active
                                ? "bg-emerald-400"
                                : "bg-slate-500"
                            }`}
                          />
                          <span className="text-sm text-slate-200">
                            {cmd.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-400 max-w-[200px] truncate">
                        {cmd.command}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-mono text-slate-400">
                          {cmd.cron_expression}
                        </div>
                        <div className="text-xs text-slate-500">
                          {describeCron(cmd.cron_expression)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {timeAgo(cmd.last_run)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {cmd.is_active ? timeUntil(cmd.next_run) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {cmd.run_count}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: cmd.id,
                                data: { is_active: !cmd.is_active },
                              })
                            }
                            className="inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                            title={cmd.is_active ? "Pause" : "Resume"}
                          >
                            {cmd.is_active ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(cmd)}
                            className="inline-flex items-center rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this schedule?"))
                                deleteMutation.mutate(cmd.id);
                            }}
                            className="inline-flex items-center rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
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
        <details className="bg-slate-800 border border-slate-700 rounded-lg">
          <summary className="px-4 py-2.5 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-300">
            Last execution results
          </summary>
          <div className="border-t border-slate-700 px-4 py-3 space-y-2">
            {schedules
              .filter((s) => s.last_result)
              .map((s) => (
                <div key={s.id}>
                  <span className="text-xs font-medium text-slate-300">
                    {s.name}:
                  </span>
                  <pre className="text-xs text-slate-500 font-mono mt-0.5 whitespace-pre-wrap break-all">
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
