import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, UserX, Ban, Users, Clock } from "lucide-react";
import { serversApi } from "../api/servers";
import ConfirmModal from "./ConfirmModal";
import type { Player } from "../types";

interface PlayerListProps {
  serverId: number;
}

function formatConnectedTime(connectedAt: string): string {
  const start = new Date(connectedAt);
  const diff = Date.now() - start.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function PlayerList({ serverId }: PlayerListProps) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{
    type: "kick" | "ban";
    player: Player;
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

  const players = playersData?.players ?? [];
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Player</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hidden sm:table-cell">Connected</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.name}
                  className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <td className="px-5 py-3 text-sm text-[#e2e8f0] font-semibold">{p.name}</td>
                  <td className="px-5 py-3 text-xs text-[#64748b] hidden sm:table-cell">
                    {p.connected_at ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatConnectedTime(p.connected_at)}
                      </span>
                    ) : (
                      <span>&mdash;</span>
                    )}
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
