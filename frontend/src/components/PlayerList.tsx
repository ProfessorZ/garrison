import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, UserX, Ban, Users, Clock, ExternalLink,
  MoreVertical, MessageSquare, MapPin, Package, X,
} from "lucide-react";
import { serversApi } from "../api/servers";
import type { EnrichedPlayer } from "../types";
import axios from "axios";

interface PlayerListProps {
  serverId: number;
  gameType: string;
}

type ActionType = "message" | "kick" | "ban" | "teleport" | "give";

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

const supportsAdvanced = (gt: string) => gt === "zomboid" || gt === "factorio";

export default function PlayerList({ serverId, gameType }: PlayerListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: ActionType; player: EnrichedPlayer } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modal form state
  const [msgText, setMsgText] = useState("");
  const [reason, setReason] = useState("");
  const [tpX, setTpX] = useState("0");
  const [tpY, setTpY] = useState("0");
  const [tpZ, setTpZ] = useState("0");
  const [itemName, setItemName] = useState("");
  const [itemCount, setItemCount] = useState("1");

  const {
    data: playersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["server-players", serverId],
    queryFn: () => serversApi.getPlayers(serverId),
    refetchInterval: 60000,
  });

  const kickMutation = useMutation({
    mutationFn: (name: string) => serversApi.kickPlayer(serverId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-players", serverId] });
      closeModal();
    },
    onError: (err) => handleApiError(err),
  });

  const banMutation = useMutation({
    mutationFn: (name: string) => serversApi.banPlayer(serverId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-players", serverId] });
      closeModal();
    },
    onError: (err) => handleApiError(err),
  });

  const messageMutation = useMutation({
    mutationFn: ({ name, message }: { name: string; message: string }) =>
      serversApi.messagePlayer(serverId, name, message),
    onSuccess: () => closeModal(),
    onError: (err) => handleApiError(err),
  });

  const teleportMutation = useMutation({
    mutationFn: ({ name, x, y, z }: { name: string; x: number; y: number; z: number }) =>
      serversApi.teleportPlayer(serverId, name, x, y, z),
    onSuccess: () => closeModal(),
    onError: (err) => handleApiError(err),
  });

  const giveMutation = useMutation({
    mutationFn: ({ name, item, count }: { name: string; item: string; count: number }) =>
      serversApi.giveItem(serverId, name, item, count),
    onSuccess: () => closeModal(),
    onError: (err) => handleApiError(err),
  });

  function handleApiError(err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 501) {
      showToast("Not supported by this server type");
    } else {
      showToast("Action failed");
    }
    closeModal();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function closeModal() {
    setModal(null);
    setMsgText("");
    setReason("");
    setTpX("0"); setTpY("0"); setTpZ("0");
    setItemName("");
    setItemCount("1");
  }

  function openAction(type: ActionType, player: EnrichedPlayer) {
    setOpenMenu(null);
    setModal({ type, player });
  }

  const handleConfirm = () => {
    if (!modal) return;
    const { type, player } = modal;
    switch (type) {
      case "message":
        if (msgText.trim()) messageMutation.mutate({ name: player.name, message: msgText.trim() });
        break;
      case "kick":
        kickMutation.mutate(player.name);
        break;
      case "ban":
        banMutation.mutate(player.name);
        break;
      case "teleport":
        teleportMutation.mutate({ name: player.name, x: Number(tpX), y: Number(tpY), z: Number(tpZ) });
        break;
      case "give":
        if (itemName.trim()) giveMutation.mutate({ name: player.name, item: itemName.trim(), count: Math.max(1, Number(itemCount)) });
        break;
    }
  };

  const isActionLoading =
    kickMutation.isPending || banMutation.isPending || messageMutation.isPending ||
    teleportMutation.isPending || giveMutation.isPending;

  const players: EnrichedPlayer[] = playersData?.players ?? [];

  const actions: { type: ActionType; label: string; icon: typeof MessageSquare; color?: string; show: boolean }[] = [
    { type: "message", label: "Message", icon: MessageSquare, show: true },
    { type: "kick", label: "Kick", icon: UserX, show: true },
    { type: "ban", label: "Ban", icon: Ban, color: "#ff4757", show: true },
    { type: "teleport", label: "Teleport", icon: MapPin, show: supportsAdvanced(gameType) },
    { type: "give", label: "Give Item", icon: Package, show: supportsAdvanced(gameType) },
  ];
  const visibleActions = actions.filter((a) => a.show);

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
        <>
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto" style={{ paddingRight: 16 }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider" style={{ width: "100%" }}>Player</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hidden md:table-cell whitespace-nowrap" style={{ width: 120 }}>First Seen</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider whitespace-nowrap" style={{ width: 140 }}>Playtime</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hidden lg:table-cell whitespace-nowrap" style={{ width: 80 }}>Sessions</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider whitespace-nowrap" style={{ width: 80 }}>Actions</th>
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
                          className="text-[#64748b] hover:text-[#00d4aa] transition-colors touch-compact"
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
                  <td className="px-5 py-3 text-xs text-[#64748b]">
                    <span className="inline-flex items-center gap-1 font-mono text-[#94a3b8]">
                      <Clock className="h-3 w-3" />
                      {formatPlaytime(p.total_time_on_server ?? 0)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#94a3b8] tabular-nums hidden lg:table-cell">
                    {p.sessions_on_server ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ActionMenu
                      player={p}
                      actions={visibleActions}
                      isOpen={openMenu === p.name}
                      onToggle={() => setOpenMenu(openMenu === p.name ? null : p.name)}
                      onAction={(type) => openAction(type, p)}
                      onClose={() => setOpenMenu(null)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="sm:hidden divide-y divide-[rgba(255,255,255,0.03)]">
          {players.map((p) => (
            <div key={p.name} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-[#e2e8f0] font-semibold truncate">{p.name}</span>
                  {p.is_banned && (
                    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-[#ff4757] bg-[rgba(255,71,87,0.08)]">
                      <Ban className="h-2 w-2" /> BAN
                    </span>
                  )}
                  {p.known_player_id && (
                    <button
                      onClick={() => navigate(`/players/${p.known_player_id}`)}
                      className="text-[#64748b] hover:text-[#00d4aa] transition-colors touch-compact"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <ActionMenu
                  player={p}
                  actions={visibleActions}
                  isOpen={openMenu === p.name}
                  onToggle={() => setOpenMenu(openMenu === p.name ? null : p.name)}
                  onAction={(type) => openAction(type, p)}
                  onClose={() => setOpenMenu(null)}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-[#64748b]">
                <span className="inline-flex items-center gap-1 font-mono text-[#94a3b8]">
                  <Clock className="h-3 w-3" />
                  {formatPlaytime(p.total_time_on_server ?? 0)}
                </span>
                {p.first_seen_on_server && (
                  <span>{formatDate(p.first_seen_on_server)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Action Modal */}
      <ActionModal
        modal={modal}
        gameType={gameType}
        loading={isActionLoading}
        onConfirm={handleConfirm}
        onCancel={closeModal}
        msgText={msgText} setMsgText={setMsgText}
        reason={reason} setReason={setReason}
        tpX={tpX} setTpX={setTpX}
        tpY={tpY} setTpY={setTpY}
        tpZ={tpZ} setTpZ={setTpZ}
        itemName={itemName} setItemName={setItemName}
        itemCount={itemCount} setItemCount={setItemCount}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in rounded-lg px-4 py-3 text-sm font-medium text-[#e2e8f0] shadow-xl"
          style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}


// ---------- Action Menu (kebab dropdown) ----------

function ActionMenu({
  player,
  actions,
  isOpen,
  onToggle,
  onAction,
  onClose,
}: {
  player: EnrichedPlayer;
  actions: { type: ActionType; label: string; icon: typeof MessageSquare; color?: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onAction: (type: ActionType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-[#64748b] hover:text-[#e2e8f0] transition-colors"
        style={{ background: isOpen ? "#1a1f2e" : "transparent" }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-30 rounded-lg py-1 shadow-xl min-w-[160px] animate-fade-in"
          style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.type}
                onClick={() => onAction(a.type)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ color: a.color || "#e2e8f0" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ---------- Action Modal ----------

function ActionModal({
  modal,
  gameType,
  loading,
  onConfirm,
  onCancel,
  msgText, setMsgText,
  reason, setReason,
  tpX, setTpX, tpY, setTpY, tpZ, setTpZ,
  itemName, setItemName, itemCount, setItemCount,
}: {
  modal: { type: ActionType; player: EnrichedPlayer } | null;
  gameType: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  msgText: string; setMsgText: (v: string) => void;
  reason: string; setReason: (v: string) => void;
  tpX: string; setTpX: (v: string) => void;
  tpY: string; setTpY: (v: string) => void;
  tpZ: string; setTpZ: (v: string) => void;
  itemName: string; setItemName: (v: string) => void;
  itemCount: string; setItemCount: (v: string) => void;
}) {
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modal, onCancel]);

  if (!modal) return null;

  const { type, player } = modal;
  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle: React.CSSProperties = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  const titles: Record<ActionType, string> = {
    message: `Message ${player.name}`,
    kick: `Kick ${player.name}?`,
    ban: `Ban ${player.name}?`,
    teleport: `Teleport ${player.name}`,
    give: `Give Item to ${player.name}`,
  };

  const confirmLabels: Record<ActionType, string> = {
    message: "Send",
    kick: "Kick Player",
    ban: "Ban Player",
    teleport: "Teleport",
    give: "Give Item",
  };

  const btnColors: Record<ActionType, string> = {
    message: "#00d4aa",
    kick: "#ffa502",
    ban: "#ff4757",
    teleport: "#00d4aa",
    give: "#00d4aa",
  };

  const btnTextColors: Record<ActionType, string> = {
    message: "#0a0e1a",
    kick: "#0a0e1a",
    ban: "#ffffff",
    teleport: "#0a0e1a",
    give: "#0a0e1a",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative shadow-2xl w-full p-6 animate-fade-in max-w-md mx-0 sm:mx-4 rounded-none sm:rounded-xl h-full sm:h-auto flex flex-col justify-center"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-md text-[#64748b] hover:text-[#e2e8f0] transition-colors"
          style={{ background: "transparent" }}
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-base font-bold text-[#e2e8f0] mb-4">{titles[type]}</h3>

        <div className="space-y-3">
          {type === "message" && (
            <input
              autoFocus
              type="text"
              placeholder="Enter message..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && msgText.trim()) onConfirm(); }}
              className={inputCls}
              style={inputStyle}
            />
          )}

          {type === "kick" && (
            <>
              <p className="text-sm text-[#94a3b8]">This will kick {player.name} from the server. They can rejoin.</p>
              <input
                type="text"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </>
          )}

          {type === "ban" && (
            <>
              <p className="text-sm text-[#94a3b8]">This will permanently ban {player.name} from the server.</p>
              <input
                type="text"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </>
          )}

          {type === "teleport" && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "X", value: tpX, set: setTpX },
                { label: "Y", value: tpY, set: setTpY },
                { label: "Z", value: tpZ, set: setTpZ },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1 uppercase">{f.label}</label>
                  <input
                    type="number"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          )}

          {type === "give" && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1 uppercase">Item</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Item name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
                <p className="text-[11px] text-[#64748b] mt-1">
                  {gameType === "zomboid" && "e.g. Base.Axe, Base.PistolAmmo"}
                  {gameType === "factorio" && "e.g. iron-plate, stone-furnace"}
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1 uppercase">Count</label>
                <input
                  type="number"
                  min={1}
                  value={itemCount}
                  onChange={(e) => setItemCount(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#e2e8f0] disabled:opacity-50 transition-all duration-150"
            style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 transition-all duration-150"
            style={{ background: btnColors[type], color: btnTextColors[type] }}
          >
            {loading ? "..." : confirmLabels[type]}
          </button>
        </div>
      </div>
    </div>
  );
}
