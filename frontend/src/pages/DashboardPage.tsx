import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Wifi,
  Users,
  Plus,
  Activity,
} from "lucide-react";
import { serversApi } from "../api/servers";
import { dashboardApi } from "../api/dashboard";
import ServerCard from "../components/ServerCard";
import AddServerModal from "../components/AddServerModal";
import ActivityFeed from "../components/ActivityFeed";
import type { ServerStatus } from "../types";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
  });

  // Dashboard stats — falls back to client-side calc from status queries
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000,
  });

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

  const deleteServer = useMutation({
    mutationFn: serversApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  // Compute stats from statuses if API stats not available
  const statuses = statusQueries.data ?? {};
  const computedOnline = Object.values(statuses).filter(
    (s) => s?.online
  ).length;
  const computedPlayers = Object.values(statuses).reduce(
    (sum, s) => sum + (s?.player_count ?? 0),
    0
  );

  const totalServers = stats?.total_servers ?? servers.length;
  const onlineServers = stats?.online_servers ?? computedOnline;
  const totalPlayers = stats?.total_players ?? computedPlayers;

  const statCards = [
    {
      label: "Total Servers",
      value: totalServers,
      icon: Server,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Online",
      value: onlineServers,
      icon: Wifi,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Total Players",
      value: totalPlayers,
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of your game servers
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Server
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-lg border ${card.border} ${card.bg} p-4 flex items-center gap-4`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/80 ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {card.value}
                </p>
                <p className="text-xs text-slate-400">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Server grid */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Server className="h-4 w-4 text-slate-500" />
          Servers
        </h3>
        {servers.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-lg">
            <Server className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-3">
              No servers configured yet
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first server
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servers.map((s) => (
              <ServerCard
                key={s.id}
                server={s}
                status={statusQueries.data?.[s.id]}
                onDelete={(id) => deleteServer.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          Recent Activity
        </h3>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <ActivityFeed compact limit={10} />
        </div>
      </div>

      {/* Add Server Modal */}
      <AddServerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
