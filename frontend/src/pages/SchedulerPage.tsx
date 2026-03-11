import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Pause, Play, Trash2, Clock } from "lucide-react";
import { serversApi } from "../api/servers";
import { schedulesApi } from "../api/schedules";
import type { ScheduledCommand } from "../types";

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

  // Fetch schedules for all servers
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Scheduled Commands
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Automate recurring RCON commands across all servers
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            showAdd
              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {showAdd ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Job
            </>
          )}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6"
        >
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            New Scheduled Command
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Server
              </label>
              <select
                value={form.server_id}
                onChange={(e) =>
                  setForm({ ...form, server_id: e.target.value })
                }
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select server...</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Job Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Daily restart"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                RCON Command
              </label>
              <input
                value={form.command}
                onChange={(e) => setForm({ ...form, command: e.target.value })}
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder='servermsg "Restarting in 5..."'
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Cron Expression
              </label>
              <input
                value={form.cron_expression}
                onChange={(e) =>
                  setForm({ ...form, cron_expression: e.target.value })
                }
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="0 */6 * * *"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createCommand.isPending}
            className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {createCommand.isPending ? "Adding..." : "Add Job"}
          </button>
        </form>
      )}

      {/* Commands table */}
      {allCommands.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">
            No scheduled commands configured.
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Create schedules per-server from the server detail page, or add one here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                  Server
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                  Command
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                  Schedule
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                  Runs
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {allCommands.map((cmd) => (
                <tr
                  key={`${cmd.server_id}-${cmd.id}`}
                  className="border-b border-slate-700/50 last:border-0"
                >
                  <td className="px-4 py-3 text-sm text-slate-200">
                    {cmd.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {serverName(cmd.server_id)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 max-w-[200px] truncate">
                    {cmd.command}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">
                    {cmd.cron_expression}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        cmd.is_active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {cmd.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {cmd.run_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        toggleActive.mutate({
                          id: cmd.id,
                          server_id: cmd.server_id,
                          is_active: !cmd.is_active,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 mr-2 transition-colors"
                    >
                      {cmd.is_active ? (
                        <>
                          <Pause className="h-3 w-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" /> Resume
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this scheduled command?"))
                          deleteCommand.mutate({
                            id: cmd.id,
                            server_id: cmd.server_id,
                          });
                      }}
                      className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
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
