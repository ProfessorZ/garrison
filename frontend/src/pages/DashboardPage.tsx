import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { serversApi } from "../api/servers";
import { dashboardApi } from "../api/dashboard";
import { metricsApi } from "../api/metrics";
import AddServerModal from "../components/AddServerModal";
import ActivityFeed from "../components/ActivityFeed";
import DashboardChart from "../components/DashboardChart";
import type { ServerStatus, ServerHeuristics } from "../types";
import { gameIcon, gameShort } from "../lib/gameMeta";

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
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

  const heuristicsQueries = useQuery({
    queryKey: ["server-heuristics-all", servers.map((s) => s.id)],
    queryFn: async () => {
      const result: Record<number, ServerHeuristics> = {};
      await Promise.allSettled(
        servers.map(async (s) => {
          try {
            result[s.id] = await metricsApi.getHeuristics(s.id);
          } catch {
            /* no data yet */
          }
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

  const nowLine = new Date().toUTCString().replace("GMT", "UTC");

  const deleteServer = useMutation({
    mutationFn: (id: number) => serversApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Fleet
          </h1>
          <p className="font-mono text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            {nowLine}
            {user?.username ? ` · operator ${user.username}` : ""}
          </p>
        </div>

        <div className="flex gap-6 flex-wrap font-mono">
          <div>
            <p className="text-[10px] tracking-widest" style={{ color: "var(--text-muted)" }}>
              SERVERS
            </p>
            <p className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {totalServers}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest" style={{ color: "var(--text-muted)" }}>
              ONLINE
            </p>
            <p className="text-[22px] font-semibold" style={{ color: "var(--success)" }}>
              {onlineServers}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest" style={{ color: "var(--text-muted)" }}>
              PLAYERS
            </p>
            <p className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {totalPlayers}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest" style={{ color: "var(--text-muted)" }}>
              KNOWN
            </p>
            <p className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {knownPlayers.toLocaleString()}
            </p>
          </div>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-accent">
          + ADD SERVER
        </button>
      </div>

      {servers.length > 0 && (
        <div className="mb-5">
          <DashboardChart />
        </div>
      )}

      {servers.length === 0 ? (
        <div
          className="text-center py-20 rounded-lg"
          style={{ background: "var(--bg-card)", border: "1px dashed rgba(255,255,255,0.1)" }}
        >
          <p className="font-mono text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            no servers configured
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            ADD YOUR FIRST SERVER
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
          {servers.map((s) => {
            const status = statuses[s.id];
            const isOnline = status?.online ?? false;
            const isLoading = status === undefined;
            const h = heuristics[s.id];
            const players = status?.player_count ?? 0;
            const uptime = h ? Math.round(h.uptime_7d * 100) : null;

            return (
              <button
                key={s.id}
                onClick={() => navigate(`/server/${s.id}`)}
                className="text-left p-4 transition-colors touch-compact"
                style={{
                  border: `1px solid ${isOnline ? "var(--border-accent)" : "rgba(217,107,92,0.35)"}`,
                  borderRadius: 8,
                  background: isOnline
                    ? "linear-gradient(180deg,#131007,#0e0c09)"
                    : "#120c0a",
                  minHeight: "unset",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isOnline
                    ? "var(--border-accent)"
                    : "rgba(217,107,92,0.35)";
                }}
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-semibold text-[15px] truncate pr-2" style={{ color: "var(--text-primary)" }}>
                    {s.name}
                  </span>
                  <span
                    className="font-mono text-[10px] shrink-0"
                    style={{ color: isLoading ? "var(--text-muted)" : isOnline ? "var(--success)" : "var(--danger)" }}
                  >
                    {isLoading ? "… CHECK" : isOnline ? "● ONLINE" : "■ DOWN"}
                  </span>
                </div>

                <div className="flex items-end gap-3 mb-2.5">
                  <span
                    className="font-mono text-[34px] font-semibold leading-none tabular-nums"
                    style={{
                      color: isOnline ? "var(--accent)" : "var(--text-dim)",
                      textShadow: isOnline ? "0 0 14px rgba(255,178,36,0.35)" : "none",
                    }}
                  >
                    {isOnline ? players : "—"}
                  </span>
                  <span className="font-mono text-[10px] pb-1" style={{ color: "var(--text-muted)" }}>
                    players · {gameIcon(s.game_type)} {gameShort(s.game_type)}
                  </span>
                </div>

                <div className="flex gap-0.5 mb-2.5 h-1">
                  {Array.from({ length: 16 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{
                        background: !isOnline
                          ? "#3a3527"
                          : i > 12 && !isOnline
                            ? "var(--danger)"
                            : "var(--success)",
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>

                <div className="flex justify-between font-mono text-[10px] items-center" style={{ color: "var(--text-muted)" }}>
                  <span className="truncate">
                    {gameShort(s.game_type)} · {s.host}:{s.port}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {uptime != null && (
                      <span style={{ color: uptime >= 90 ? "var(--success)" : uptime >= 75 ? "var(--warning)" : "var(--danger)" }}>
                        {uptime}% 7D
                      </span>
                    )}
                    {isAdmin && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete server "${s.name}"? This cannot be undone.`)) {
                            deleteServer.mutate(s.id);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            if (confirm(`Delete server "${s.name}"? This cannot be undone.`)) {
                              deleteServer.mutate(s.id);
                            }
                          }
                        }}
                        className="px-1.5 py-0.5 rounded"
                        style={{ color: "var(--danger)", border: "1px solid rgba(217,107,92,0.3)" }}
                        title="Delete server"
                      >
                        ✕
                      </span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, background: "#080705" }}
      >
        <div
          className="flex items-center gap-3 flex-wrap px-3.5 py-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--accent)" }}>
            LIVE TAIL — ACTIVITY
          </span>
          <span className="blink w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
          <button
            onClick={() => navigate("/activity")}
            className="ml-auto font-mono text-[10px] px-2.5 py-1 touch-compact"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              minHeight: "unset",
            }}
          >
            FULL LOG →
          </button>
        </div>
        <div className="p-4">
          <ActivityFeed compact limit={10} />
        </div>
      </div>

      <AddServerModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
