import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RefreshCw, UserX, Ban, Users, Clock, ExternalLink } from "lucide-react";
import { serversApi } from "../api/servers";
import ConfirmModal from "./ConfirmModal";
import type { EnrichedPlayer } from "../types";

interface PlayerListProps {
  serverId: number;
}


function formatPlaytime(seconds: number): string {
  if (seconds < 60) return "<1m";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PlayerList({ serverId }: PlayerListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<{
    type: "kick" | "ban";
    player: EnrichedPlayer;
  } | null>(null);

  const {
    data: playersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["server-players", serverId],
    queryFn: () => serversApi.getPlayers(serverId),
    refetchInterval: 15000,
  });

  const kickMutation = useMutation({
    mutationFn: (name: string) => serversApi.kickPlayer(serverId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-players", serverId] });
      setConfirmAction(null);
    },
  });

  const banMutation = useMutation({
    mutationFn: (name: string) => serversApi.banPlayer(serverId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-players", serverId] });
      setConfirmAction(null);
    },
  });

  const players: EnrichedPlayer[] = playersData?.players ?? [];
  const isActionLoading = kickMutation.isPending || banMutation.isPending;

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "kick") {
      kickMutation.mutate(confirmAction.player.name);
    } else {
      banMutation.mutate(confirmAction.player.name);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
          <Users className="h-4 w-4 text-[#64748b]" />
          Players
          <span className="text-[#64748b] font-normal">({players.length})</span>
        </h3>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e2e8f0] disabled:opacity-50 transition-all duration-150"
          style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading && players.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
        </div>
      ) : players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-8 w-8 text-[#1a1f2e] mb-3" />
          <p className="text-sm text-[#94a3b8]">No players online</p>
          <p className="text-xs text-[#64748b] mt-1">Players will appear here when they connect</p>
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ paddingRight: 16 }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider" style={{ width: "100%" }}>Player</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hidden md:table-cell whitespace-nowrap" style={{ width: 120 }}>First Seen</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hidden sm:table-cell whitespace-nowrap" style={{ width: 140 }}>Playtime (Server)</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hidden lg:table-cell whitespace-nowrap" style={{ width: 80 }}>Sessions</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider whitespace-nowrap" style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr
                  key={p.name}
                  className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    background: i % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent",
                  }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#e2e8f0] font-semibold">{p.name}</span>
                      {p.is_banned && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-[#ff4757] bg-[rgba(255,71,87,0.08)]">
                          <Ban className="h-2 w-2" /> BAN
                        </span>
                      )}
                      {p.known_player_id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/players/${p.known_player_id}`); }}
                          className="text-[#64748b] hover:text-[#00d4aa] transition-colors"
                          title="View player profile"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748b] hidden md:table-cell">
                    {p.first_seen_on_server ? formatDate(p.first_seen_on_server) : formatDate(p.first_seen)}
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748b] hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 font-mono text-[#94a3b8]">
                      <Clock className="h-3 w-3" />
                      {formatPlaytime(p.total_time_on_server ?? 0)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#94a3b8] tabular-nums hidden lg:table-cell">
                    {p.sessions_on_server ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => setConfirmAction({ type: "kick", player: p })}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
                        style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <UserX className="h-3 w-3" /> Kick
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "ban", player: p })}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#ff4757] transition-all duration-150"
                        style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.12)" }}
                      >
                        <Ban className="h-3 w-3" /> Ban
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={confirmAction !== null}
        title={
          confirmAction?.type === "kick"
            ? `Kick ${confirmAction.player.name}?`
            : `Ban ${confirmAction?.player.name}?`
        }
        message={
          confirmAction?.type === "kick"
            ? `This will kick ${confirmAction.player.name} from the server. They can rejoin.`
            : `This will permanently ban ${confirmAction?.player.name} from the server.`
        }
        confirmLabel={confirmAction?.type === "kick" ? "Kick Player" : "Ban Player"}
        variant={confirmAction?.type === "ban" ? "danger" : "warning"}
        loading={isActionLoading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
