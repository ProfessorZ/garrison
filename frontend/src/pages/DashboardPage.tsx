import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { serversApi } from "../api/servers";
import ServerCard from "../components/ServerCard";
import type { ServerStatus } from "../types";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    host: "",
    port: "",
    rcon_port: "",
    rcon_password: "",
    game_type: "zomboid",
  });

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
  });

  // Fetch statuses for each server
  const statusQueries = useQuery({
    queryKey: ["server-statuses", servers.map((s) => s.id)],
    queryFn: async () => {
      const statuses: Record<number, ServerStatus | null> = {};
      await Promise.allSettled(
        servers.map(async (s) => {
          try {
            statuses[s.id] = await serversApi.getStatus(s.id);
          } catch {
            statuses[s.id] = { online: false, player_count: null };
          }
        })
      );
      return statuses;
    },
    enabled: servers.length > 0,
    refetchInterval: 30000,
  });

  const createServer = useMutation({
    mutationFn: serversApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      setShowAdd(false);
      setForm({
        name: "",
        host: "",
        port: "",
        rcon_port: "",
        rcon_password: "",
        game_type: "zomboid",
      });
    },
  });

  const deleteServer = useMutation({
    mutationFn: serversApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    createServer.mutate({
      ...form,
      port: parseInt(form.port),
      rcon_port: parseInt(form.rcon_port),
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Servers</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your game servers
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
              <Plus className="h-4 w-4" /> Add Server
            </>
          )}
        </button>
      </div>

      {/* Add server form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6"
        >
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            New Server
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="My Server"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Host
              </label>
              <input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Game Port
              </label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="16261"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                RCON Port
              </label>
              <input
                type="number"
                value={form.rcon_port}
                onChange={(e) =>
                  setForm({ ...form, rcon_port: e.target.value })
                }
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="27015"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                RCON Password
              </label>
              <input
                type="password"
                value={form.rcon_password}
                onChange={(e) =>
                  setForm({ ...form, rcon_password: e.target.value })
                }
                required
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Game Type
              </label>
              <select
                value={form.game_type}
                onChange={(e) =>
                  setForm({ ...form, game_type: e.target.value })
                }
                className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="zomboid">Project Zomboid</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={createServer.isPending}
            className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {createServer.isPending ? "Adding..." : "Add Server"}
          </button>
        </form>
      )}

      {/* Server grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {servers.map((s) => (
          <ServerCard
            key={s.id}
            server={s}
            status={statusQueries.data?.[s.id]}
            onDelete={(id) => deleteServer.mutate(id)}
          />
        ))}
      </div>

      {servers.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm">
            No servers configured. Click &ldquo;Add Server&rdquo; to get
            started.
          </p>
        </div>
      )}
    </div>
  );
}
