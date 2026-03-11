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
      queryClient.invalidateQueries({
        queryKey: ["server-players", serverId],
      });
      setConfirmAction(null);
    },
  });

  const banMutation = useMutation({
    mutationFn: (name: string) => serversApi.banPlayer(serverId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["server-players", serverId],
      });
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
    <div className="bg-slate-800 border border-slate-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          Players ({players.length})
        </h3>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Player list */}
      {isLoading && players.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
        </div>
      ) : players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-8 w-8 text-slate-600 mb-2" />
          <p className="text-sm text-slate-500">No players online</p>
          <p className="text-xs text-slate-600 mt-1">
            Players will appear here when they connect
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Player
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 hidden sm:table-cell">
                  Connected
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.name}
                  className="border-b border-slate-700/50 last:border-0 hover:bg-slate-750/50"
                >
                  <td className="px-4 py-2.5 text-sm text-slate-200 font-medium">
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 hidden sm:table-cell">
                    {p.connected_at ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatConnectedTime(p.connected_at)}
                      </span>
                    ) : (
                      <span className="text-slate-600">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() =>
                          setConfirmAction({ type: "kick", player: p })
                        }
                        className="inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        <UserX className="h-3 w-3" />
                        Kick
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({ type: "ban", player: p })
                        }
                        className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Ban className="h-3 w-3" />
                        Ban
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
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
