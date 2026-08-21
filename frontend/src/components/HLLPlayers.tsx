import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  AlertTriangle,
  Ban,
  MessageSquare,
  ArrowLeftRight,
  Skull,
  Clock,
  X,
  Send,
} from "lucide-react";
import { serversApi } from "../api/servers";
import { hllApi } from "../api/hll";

interface Props {
  serverId: number;
}

type ActionType = "punish" | "kick" | "temp-ban" | "perm-ban" | "message" | "switch-team";

interface ActiveAction {
  playerId: string;
  playerName: string;
  type: ActionType;
}

export default function HLLPlayers({ serverId }: Props) {
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [reason, setReason] = useState("");
  const [banHours, setBanHours] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: playersData, isLoading } = useQuery({
    queryKey: ["server-players", serverId],
    queryFn: () => serversApi.getPlayers(serverId),
    refetchInterval: 30000,
  });

  const players = playersData?.players ?? [];

  const doAction = useMutation({
    mutationFn: async () => {
      if (!activeAction) return;
      const { playerId, type } = activeAction;
      switch (type) {
        case "punish": return hllApi.punishPlayer(serverId, playerId, reason);
        case "kick": return hllApi.kickPlayer(serverId, playerId, reason);
        case "temp-ban": return hllApi.tempBanPlayer(serverId, playerId, banHours, reason);
        case "perm-ban": return hllApi.permBanPlayer(serverId, playerId, reason);
        case "message": return hllApi.messagePlayer(serverId, playerId, message);
        case "switch-team": return hllApi.switchTeam(serverId, playerId, false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-players", serverId] });
      closeAction();
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const closeAction = () => {
    setActiveAction(null);
    setReason("");
    setMessage("");
    setBanHours(1);
  };

  const openAction = (playerId: string, playerName: string, type: ActionType) => {
    if (type === "switch-team") {
      // Direct action — no form needed
      setActiveAction({ playerId, playerName, type });
      setTimeout(() => doAction.mutate(), 0);
      return;
    }
    setActiveAction({ playerId, playerName, type });
    setReason("");
    setMessage("");
  };

  const actionLabels: Record<ActionType, { label: string; color: string; icon: typeof Ban }> = {
    punish: { label: "Punish", color: "#e3b454", icon: Skull },
    kick: { label: "Kick", color: "#d96b5c", icon: AlertTriangle },
    "temp-ban": { label: "Temp Ban", color: "#ff6348", icon: Clock },
    "perm-ban": { label: "Perm Ban", color: "#d96b5c", icon: Ban },
    message: { label: "Message", color: "#38bdf8", icon: MessageSquare },
    "switch-team": { label: "Switch", color: "#a78bfa", icon: ArrowLeftRight },
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none";
  const inputStyle = { background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-[#d96b5c]" style={{ background: "rgba(217, 107, 92,0.08)", border: "1px solid rgba(217, 107, 92,0.15)" }}>
          {error}
          <button onClick={() => setError("")} className="ml-2 text-[#d96b5c] hover:text-white"><X className="h-3 w-3 inline" /></button>
        </div>
      )}

      {/* Action Modal */}
      {activeAction && activeAction.type !== "switch-team" && (
        <div className="rounded-xl p-4" style={{
          background: "#0e0c09",
          border: `1px solid ${actionLabels[activeAction.type].color}30`,
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {(() => { const Icon = actionLabels[activeAction.type].icon; return <Icon className="h-4 w-4" style={{ color: actionLabels[activeAction.type].color }} />; })()}
              <span className="text-sm font-bold text-[#e8e3d8]">
                {actionLabels[activeAction.type].label}: {activeAction.playerName}
              </span>
            </div>
            <button onClick={closeAction} className="p-1 text-[#6b6455] hover:text-[#e8e3d8]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {activeAction.type === "message" ? (
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message to send..."
                className={inputCls}
                style={inputStyle}
                autoFocus
              />
            ) : (
              <>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason..."
                  className={inputCls}
                  style={inputStyle}
                  autoFocus
                />
                {activeAction.type === "temp-ban" && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#8a8271] font-semibold">Duration:</label>
                    <input
                      type="number"
                      value={banHours}
                      onChange={(e) => setBanHours(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-20 rounded-lg px-3 py-2 text-sm text-[#e8e3d8] focus:outline-none"
                      style={inputStyle}
                    />
                    <span className="text-xs text-[#6b6455]">hours</span>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => doAction.mutate()}
              disabled={doAction.isPending || (activeAction.type === "message" ? !message.trim() : false)}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: actionLabels[activeAction.type].color }}
            >
              <Send className="h-3 w-3" />
              {doAction.isPending ? "Sending..." : `Confirm ${actionLabels[activeAction.type].label}`}
            </button>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="rounded-xl p-4" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#e8e3d8] uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-[#ffb224]" />
            Players ({players.length})
          </h3>
        </div>

        {players.length === 0 ? (
          <div className="text-sm text-[#6b6455] text-center py-8">No players online</div>
        ) : (
          <div className="space-y-0.5">
            {players.map((p: { name: string; steam_id?: string; player_id?: string; team?: string; role?: string; level?: number }) => {
              const playerId = (p as any).iD || p.steam_id || p.player_id || p.name;
              return (
                <div
                  key={playerId}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 group hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: "rgba(255, 178, 36,0.1)", color: "#ffb224" }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-[#e8e3d8] font-medium truncate">{p.name}</div>
                      <div className="flex items-center gap-2">
                        {playerId !== p.name && (
                          <span className="text-[10px] text-[#6b6455] font-mono">{playerId}</span>
                        )}
                        {p.team && (
                          <span className="text-[10px] text-[#8a8271] font-medium">{p.team}</span>
                        )}
                        {p.role && (
                          <span className="text-[10px] text-[#6b6455]">{p.role}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {(Object.keys(actionLabels) as ActionType[]).map((type) => {
                      const cfg = actionLabels[type];
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => openAction(playerId, p.name, type)}
                          title={cfg.label}
                          className="p-1.5 rounded-md transition-colors"
                          style={{ color: "#6b6455" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = cfg.color; e.currentTarget.style.background = `${cfg.color}12`; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#6b6455"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
