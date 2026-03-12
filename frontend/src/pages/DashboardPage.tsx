import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Wifi,
  Users,
  Plus,
  Activity,
  Terminal,
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

  const statuses = statusQueries.data ?? {};
  const computedOnline = Object.values(statuses).filter((s) => s?.online).length;
  const computedPlayers = Object.values(statuses).reduce(
    (sum, s) => sum + (s?.player_count ?? 0),
    0
  );

  const totalServers = stats?.total_servers ?? servers.length;
  const onlineServers = stats?.online_servers ?? computedOnline;
  const totalPlayers = stats?.total_players ?? computedPlayers;

  const statCards = [
    { label: "Total Servers", value: totalServers, icon: Server },
    { label: "Online", value: onlineServers, icon: Wifi },
    { label: "Players Online", value: totalPlayers, icon: Users },
    { label: "Commands Today", value: "—", icon: Terminal },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-[#e2e8f0]">Dashboard</h2>
          <p className="text-sm text-[#64748b] mt-1">
            Overview of your game servers
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-[#0a0e1a] transition-all duration-150 hover:shadow-[0_0_20px_rgba(0,212,170,0.2)]"
          style={{ background: "#00d4aa" }}
        >
          <Plus className="h-4 w-4" />
          Add Server
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl p-5 transition-all duration-150 hover:-translate-y-px animate-fade-in animate-fade-in-delay-${i}`}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Icon className="h-4 w-4 text-[#64748b] mb-3" />
              <p className="text-3xl font-bold gradient-text tabular-nums">
                {card.value}
              </p>
              <p className="text-xs text-[#64748b] mt-1 font-medium">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Server list */}
      <div className="mb-10 animate-fade-in animate-fade-in-delay-2">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-4 w-4 text-[#64748b]" />
          <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">
            Servers
          </h3>
        </div>
        {servers.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <Server className="h-10 w-10 text-[#1a1f2e] mx-auto mb-3" />
            <p className="text-[#94a3b8] text-sm mb-4">
              No servers configured yet
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-[#0a0e1a] transition-all duration-150"
              style={{ background: "#00d4aa" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first server
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {/* Recent activity */}
      <div className="animate-fade-in animate-fade-in-delay-3">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-[#64748b]" />
          <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">
            Recent Activity
          </h3>
        </div>
        <div className="rounded-xl p-5" style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <ActivityFeed compact limit={10} />
        </div>
      </div>

      <AddServerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
