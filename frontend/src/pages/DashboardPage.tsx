import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Server,
  Wifi,
  WifiOff,
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Gamepad2,
  Clock,
  Database,
} from "lucide-react";
import { serversApi } from "../api/servers";
import { dashboardApi } from "../api/dashboard";
import { metricsApi } from "../api/metrics";
import AddServerModal from "../components/AddServerModal";
import ActivityFeed from "../components/ActivityFeed";
import DashboardChart from "../components/DashboardChart";
import type { ServerStatus, ServerHeuristics } from "../types";

export default function DashboardPage() {
  const navigate = useNavigate();
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

  // Fetch heuristics for all servers
  const heuristicsQueries = useQuery({
    queryKey: ["server-heuristics-all", servers.map((s) => s.id)],
    queryFn: async () => {
      const result: Record<number, ServerHeuristics> = {};
      await Promise.allSettled(
        servers.map(async (s) => {
          try {
            result[s.id] = await metricsApi.getHeuristics(s.id);
          } catch { /* no data yet */ }
        })
      );
      return result;
    },
    enabled: servers.length > 0,
    refetchInterval: 120000,
  });

  const heuristics = heuristicsQueries.data ?? {};

  const statuses = statusQueries.data ?? {};
  const computedOnline = Object.values(statuses).filter((s) => s?.online).length;
  const computedPlayers = Object.values(statuses).reduce(
    (sum, s) => sum + (s?.player_count ?? 0),
    0
  );

  const totalServers = stats?.total_servers ?? servers.length;
  const onlineServers = stats?.online_servers ?? computedOnline;
  const totalPlayers = stats?.total_players ?? computedPlayers;

  const knownPlayers = stats?.known_players ?? 0;

  const statCards = [
    { label: "Total Servers", value: totalServers, icon: Server, accent: "#00d4aa" },
    { label: "Online", value: onlineServers, icon: Wifi, accent: "#00d4aa" },
    { label: "Players", value: totalPlayers, icon: Users, accent: "#818cf8" },
    { label: "Known Players", value: knownPlayers, icon: Database, accent: "#fbbf24" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-10 animate-fade-in">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h2>
          <p className="text-[#64748b] mt-2">Manage and monitor your game servers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-bold text-[#0a0e1a] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,212,170,0.25)] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #00d4aa, #00b894)" }}
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Add Server
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5 group"
              style={{
                background: "linear-gradient(135deg, #111827 0%, #0f1420 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Glow accent */}
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300"
                style={{ background: card.accent }} />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2" style={{ background: `${card.accent}15` }}>
                    <Icon className="h-4 w-4" style={{ color: card.accent }} />
                  </div>
                  <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">{card.label}</span>
                </div>
                <p className="text-4xl font-black text-white tabular-nums tracking-tight">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashboard Chart */}
      {servers.length > 0 && (
        <div className="mb-12 animate-fade-in">
          <DashboardChart />
        </div>
      )}

      {/* Servers */}
      <div className="mb-12 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Servers</h3>
          <span className="text-xs text-[#64748b]">{servers.length} configured</span>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-24 rounded-2xl"
            style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.08)" }}>
            <div className="rounded-2xl p-4 inline-block mb-4" style={{ background: "rgba(0,212,170,0.06)" }}>
              <Server className="h-8 w-8 text-[#00d4aa]" />
            </div>
            <p className="text-[#94a3b8] mb-6">No servers configured yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#0a0e1a] transition-all duration-200 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #00d4aa, #00b894)" }}
            >
              <Plus className="h-4 w-4" />
              Add your first server
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((s) => {
              const status = statuses[s.id];
              const isOnline = status?.online ?? false;
              const isLoading = status === undefined;

              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/server/${s.id}`)}
                  className="group relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #111827 0%, #0f1420 100%)",
                    border: `1px solid ${isOnline ? "rgba(0,212,170,0.15)" : "rgba(255,255,255,0.06)"}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = isOnline ? "rgba(0,212,170,0.3)" : "rgba(255,255,255,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isOnline ? "rgba(0,212,170,0.15)" : "rgba(255,255,255,0.06)")}
                >
                  {/* Online glow */}
                  {isOnline && (
                    <div className="absolute top-0 left-0 h-full w-1 rounded-l-2xl" style={{ background: "#00d4aa" }} />
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5 min-w-0">
                      {/* Status indicator */}
                      <div className={`relative flex items-center justify-center h-12 w-12 rounded-xl shrink-0 ${
                        isOnline ? "bg-[rgba(0,212,170,0.08)]" : "bg-[rgba(255,71,87,0.06)]"
                      }`}>
                        {isLoading ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#64748b] border-t-transparent" />
                        ) : isOnline ? (
                          <Wifi className="h-5 w-5 text-[#00d4aa]" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-[#ff4757]" />
                        )}
                      </div>

                      {/* Server info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h4 className="text-base font-bold text-white group-hover:text-[#00d4aa] transition-colors truncate">
                            {s.name}
                          </h4>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                            isOnline
                              ? "text-[#00d4aa] bg-[rgba(0,212,170,0.1)]"
                              : "text-[#ff4757] bg-[rgba(255,71,87,0.08)]"
                          }`}>
                            {isLoading ? "checking" : isOnline ? "online" : "offline"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#64748b]">
                          <span className="font-mono text-[#94a3b8]">{s.host}:{s.port}</span>
                          <span className="inline-flex items-center gap-1">
                            <Gamepad2 className="h-3 w-3" />
                            {s.game_type}
                          </span>
                          {s.last_checked && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(s.last_checked).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-6 shrink-0">
                      {/* Trend + Uptime indicators */}
                      {heuristics[s.id] && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {heuristics[s.id].trend === "growing" ? (
                              <TrendingUp className="h-3.5 w-3.5 text-[#00d4aa]" />
                            ) : heuristics[s.id].trend === "declining" ? (
                              <TrendingDown className="h-3.5 w-3.5 text-[#ff4757]" />
                            ) : (
                              <Minus className="h-3.5 w-3.5 text-[#64748b]" />
                            )}
                            <span className="text-[10px] font-bold" style={{
                              color: heuristics[s.id].trend === "growing" ? "#00d4aa" : heuristics[s.id].trend === "declining" ? "#ff4757" : "#64748b",
                            }}>
                              {heuristics[s.id].trend_percent > 0 ? "+" : ""}{heuristics[s.id].trend_percent}%
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold tabular-nums" style={{
                              color: heuristics[s.id].uptime_7d >= 0.9 ? "#00d4aa" : heuristics[s.id].uptime_7d >= 0.7 ? "#fbbf24" : "#ff4757",
                            }}>
                              {(heuristics[s.id].uptime_7d * 100).toFixed(0)}%
                            </p>
                            <p className="text-[9px] text-[#64748b] uppercase tracking-wider">uptime</p>
                          </div>
                        </div>
                      )}
                      {isOnline && status?.player_count != null && (
                        <div className="text-right">
                          <p className="text-2xl font-black text-white tabular-nums">{status.player_count}</p>
                          <p className="text-[10px] text-[#64748b] uppercase tracking-wider font-semibold">players</p>
                        </div>
                      )}
                      <ChevronRight className="h-5 w-5 text-[#374151] group-hover:text-[#00d4aa] transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <button
            onClick={() => navigate("/activity")}
            className="text-xs text-[#00d4aa] hover:text-[#00b894] font-semibold transition-colors"
          >
            View all →
          </button>
        </div>
        <div className="rounded-2xl p-6"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
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
