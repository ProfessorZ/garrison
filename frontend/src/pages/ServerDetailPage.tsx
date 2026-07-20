import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Terminal,
  Users,
  Settings,
  Save,
  MessageSquare,
  Activity,
  Shield,
  Clock,
  SlidersHorizontal,
  Bell,
  Zap,
  Crosshair,
  Map,
  BarChart3,
  PieChart,
} from "lucide-react";
import { serversApi } from "../api/servers";
import { pluginsApi } from "../api/plugins";
import { hllApi } from "../api/hll";
import { useAuth } from "../contexts/AuthContext";
import RconConsole from "../components/RconConsole";
import PlayerList from "../components/PlayerList";
import ChatLog from "../components/ChatLog";
import KillFeed from "../components/KillFeed";
import ActivityFeed from "../components/ActivityFeed";
import ServerPermissions from "../components/ServerPermissions";
import ScheduleManager from "../components/ScheduleManager";
import ServerOptions from "../components/ServerOptions";
import DiscordSettings from "../components/DiscordSettings";
import TriggerManager from "../components/TriggerManager";
import ServerMetrics from "../components/ServerMetrics";
import ServerAnalytics from "../components/ServerAnalytics";
import HLLMapRotation from "../components/HLLMapRotation";
import HLLServerSettings from "../components/HLLServerSettings";
import HLLPlayers from "../components/HLLPlayers";
import HLLBroadcast from "../components/HLLBroadcast";
import MapChangePanel from "../components/MapChangePanel";
import { gameIcon, gameLabel, gameShort } from "../lib/gameMeta";

type Tab = "console" | "players" | "chat" | "kills" | "metrics" | "schedules" | "options" | "activity" | "triggers" | "discord" | "settings" | "permissions" | "hll-maps" | "hll-settings" | "hll-players" | "analytics";

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const serverId = Number(id);

  const [tab, setTab] = useState<Tab>("console");
  const [confirmAction, setConfirmAction] = useState<"restart" | "end-match" | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const { data: server, isLoading: serverLoading } = useQuery({
    queryKey: ["server", serverId],
    queryFn: () => serversApi.get(serverId),
    enabled: !isNaN(serverId),
  });

  const { data: status } = useQuery({
    queryKey: ["server-status", serverId],
    queryFn: () => serversApi.getStatus(serverId),
    enabled: !isNaN(serverId),
    refetchInterval: 60000,
  });

  if (serverLoading || !server) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
      </div>
    );
  }

  const isOnline = status?.online ?? false;
  const playerCount = status?.player_count;
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const isHLL = server.game_type === "hll";

  const tabs: { key: Tab; label: string; icon: typeof Terminal; adminOnly?: boolean }[] = isHLL
    ? [
        { key: "console", label: "Console", icon: Terminal },
        { key: "hll-players", label: "Players", icon: Users },
        { key: "hll-maps", label: "Maps", icon: Map },
        { key: "chat", label: "Chat", icon: MessageSquare },
        { key: "kills", label: "Kill Feed", icon: Crosshair },
        { key: "analytics", label: "Analytics", icon: PieChart },
        { key: "metrics", label: "Metrics", icon: BarChart3 },
        { key: "hll-settings", label: "Game Settings", icon: SlidersHorizontal },
        { key: "schedules", label: "Schedules", icon: Clock },
        { key: "activity", label: "Activity", icon: Activity },
        { key: "triggers", label: "Triggers", icon: Zap, adminOnly: true },
        { key: "discord", label: "Discord", icon: Bell, adminOnly: true },
        { key: "settings", label: "Settings", icon: Settings, adminOnly: true },
        { key: "permissions", label: "Access", icon: Shield, adminOnly: true },
      ]
    : [
        { key: "console", label: "Console", icon: Terminal },
        { key: "players", label: "Players", icon: Users },
        { key: "chat", label: "Chat", icon: MessageSquare },
        { key: "kills", label: "Kill Feed", icon: Crosshair },
        { key: "analytics", label: "Analytics", icon: PieChart },
        { key: "metrics", label: "Metrics", icon: BarChart3 },
        { key: "schedules", label: "Schedules", icon: Clock },
        { key: "options", label: "Options", icon: SlidersHorizontal },
        { key: "activity", label: "Activity", icon: Activity },
        { key: "triggers", label: "Triggers", icon: Zap, adminOnly: true },
        { key: "discord", label: "Discord", icon: Bell, adminOnly: true },
        { key: "settings", label: "Settings", icon: Settings, adminOnly: true },
        { key: "permissions", label: "Access", icon: Shield, adminOnly: true },
      ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] mb-3.5 transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft className="h-3 w-3" />
        ← FLEET
      </Link>

      <div
        className="p-[18px] sm:px-5 mb-3.5 flex items-center gap-5 flex-wrap"
        style={{
          border: "1px solid var(--border-accent)",
          borderRadius: 8,
          background: "linear-gradient(180deg,#131007,#0e0c09)",
        }}
      >
        <div className="min-w-[220px]">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-[22px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {server.name}
            </h1>
            <span
              className="font-mono text-[10px] shrink-0"
              style={{
                color:
                  status === undefined
                    ? "var(--text-muted)"
                    : isOnline
                      ? "var(--success)"
                      : "var(--danger)",
              }}
            >
              {status === undefined ? "… CHECK" : isOnline ? "● ONLINE" : "■ OFFLINE"}
            </span>
          </div>
          <p className="font-mono text-[10.5px] mt-1" style={{ color: "var(--text-muted)" }}>
            {server.host}:{server.port} · rcon:{server.rcon_port} · {gameIcon(server.game_type)}{" "}
            {gameShort(server.game_type)} · {gameLabel(server.game_type)}
          </p>
        </div>

        {isOnline && playerCount != null && (
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[40px] font-semibold leading-none tabular-nums"
              style={{ color: "var(--accent)", textShadow: "0 0 14px rgba(255,178,36,0.35)" }}
            >
              {playerCount}
            </span>
            <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
              players
            </span>
          </div>
        )}
      </div>

      {/* HLL Broadcast Banner + Admin Controls */}
      {isHLL && (
        <div className="mt-4" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}><HLLBroadcast serverId={serverId} /></div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfirmAction("end-match")}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)", color: "#e3b454", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                ⏭ End Match
              </button>
              <button
                onClick={() => setConfirmAction("restart")}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(217, 107, 92,0.3)", background: "rgba(217, 107, 92,0.08)", color: "#d96b5c", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                🔄 Restart Server
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}
          onClick={() => !actionPending && setConfirmAction(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%" }}>
            <h3 style={{ color: "#e8e3d8", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              {confirmAction === "restart" ? "Restart Server?" : "End Match?"}
            </h3>
            <p style={{ color: "#8a8271", fontSize: 13, marginBottom: 20 }}>
              {confirmAction === "restart"
                ? "This will restart the HLL server and disconnect all players. Are you sure?"
                : "This will end the current match and advance to the next map. Are you sure?"}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                disabled={actionPending}
                onClick={() => setConfirmAction(null)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8a8271", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                disabled={actionPending}
                onClick={async () => {
                  setActionPending(true);
                  try {
                    if (confirmAction === "restart") await hllApi.restartServer(serverId);
                    else await hllApi.endMatch(serverId);
                    setConfirmAction(null);
                  } catch { /* toast could go here */ }
                  setActionPending(false);
                }}
                style={{
                  padding: "7px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: confirmAction === "restart" ? "#d96b5c" : "#e3b454",
                  color: confirmAction === "restart" ? "#fff" : "#0b0a08",
                  opacity: actionPending ? 0.6 : 1,
                }}
              >
                {actionPending ? "Processing..." : confirmAction === "restart" ? "Restart" : "End Match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs — underline style, horizontally scrollable */}
      <TabBar visibleTabs={visibleTabs} tab={tab} setTab={setTab} />

      {/* Tab content */}
      <div className="animate-fade-in pt-5" key={tab}>
        {tab === "console" && (
          <RconConsole serverId={serverId} gameType={server.game_type} />
        )}
        {tab === "players" && <PlayerList serverId={serverId} gameType={server.game_type} />}
        {tab === "hll-players" && <HLLPlayers serverId={serverId} />}
        {tab === "hll-maps" && <HLLMapRotation serverId={serverId} />}
        {tab === "hll-settings" && <HLLServerSettings serverId={serverId} />}
        {tab === "chat" && <ChatLog serverId={serverId} />}
        {tab === "kills" && <KillFeed serverId={serverId} />}
        {tab === "analytics" && <ServerAnalytics serverId={serverId} />}
        {tab === "metrics" && <ServerMetrics serverId={serverId} />}
        {tab === "schedules" && (
          <div className="rounded-xl p-5" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
            <ScheduleManager serverId={serverId} />
          </div>
        )}
        {tab === "options" && <ServerOptions serverId={serverId} />}
        {tab === "activity" && (
          <div className="rounded-xl" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)", padding: 20 }}>
            <ActivityFeed serverId={serverId} limit={25} />
          </div>
        )}
        {tab === "triggers" && isAdmin && (
          <div className="rounded-xl p-5" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
            <TriggerManager serverId={serverId} />
          </div>
        )}
        {tab === "discord" && isAdmin && (
          <DiscordSettings serverId={serverId} />
        )}
        {tab === "settings" && (
          <>
            <SettingsPanel
              serverId={serverId}
              server={server}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["server", serverId] })}
            />
            {!isHLL && server.game_type !== "dayz" && (
              <MapChangePanel serverId={serverId} gameType={server.game_type} />
            )}
          </>
        )}
        {tab === "permissions" && isAdmin && (
          <ServerPermissions serverId={serverId} />
        )}
      </div>
    </div>
  );
}

// ---------- Tab Bar (scrollable with shadows) ----------

function TabBar({
  visibleTabs,
  tab,
  setTab,
}: {
  visibleTabs: { key: Tab; label: string; icon: typeof Terminal }[];
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateShadows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateShadows();
    el.addEventListener("scroll", updateShadows, { passive: true });
    window.addEventListener("resize", updateShadows);
    return () => {
      el.removeEventListener("scroll", updateShadows);
      window.removeEventListener("resize", updateShadows);
    };
  }, [updateShadows]);

  return (
    <div className="relative mb-3.5">
      {showLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #0b0a08, transparent)" }} />
      )}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #0b0a08, transparent)" }} />
      )}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto tab-scroll flex-wrap"
        style={{ scrollbarWidth: "none" }}
      >
        <style>{`.tab-scroll::-webkit-scrollbar { display: none; }`}</style>
        {visibleTabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="font-mono text-[10px] font-semibold tracking-widest whitespace-nowrap px-3 py-1.5 touch-compact"
              style={{
                color: active ? "#0b0a08" : "var(--text-secondary)",
                background: active ? "var(--accent)" : "transparent",
                borderRadius: 4,
                border: active ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.1)",
                minHeight: "unset",
              }}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Settings Panel ----------

function PluginSelect({ value, onChange, inputCls, inputStyle }: {
  value: string;
  onChange: (v: string) => void;
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  const { data: pluginData } = useQuery({ queryKey: ["plugins"], queryFn: pluginsApi.list, staleTime: 60_000 });
  const plugins = pluginData?.plugins ?? [];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} style={inputStyle}>
      {plugins.map((p) => (
        <option key={p.id} value={p.id}>{p.display_name ?? p.name}</option>
      ))}
      {plugins.length === 0 && <option value={value}>{value}</option>}
    </select>
  );
}

interface SettingsPanelProps {
  serverId: number;
  server: { name: string; host: string; port: number; query_port?: number | null; rcon_port: number; game_type: string };
  onSaved: () => void;
}

function SettingsPanel({ serverId, server, onSaved }: SettingsPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: server.name,
    host: server.host,
    port: String(server.port),
    query_port: server.query_port ? String(server.query_port) : "",
    rcon_port: String(server.rcon_port),
    rcon_password: "",
    game_type: server.game_type,
  });
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof serversApi.update>[1]) =>
      serversApi.update(serverId, data),
    onSuccess: () => {
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => serversApi.delete(serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      navigate("/", { replace: true });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: Record<string, string | number | null> = {
      name: form.name,
      host: form.host,
      port: parseInt(form.port),
      query_port: form.query_port ? parseInt(form.query_port) : null,
      rcon_port: parseInt(form.rcon_port),
      game_type: form.game_type,
    };
    if (form.rcon_password) data.rcon_password = form.rcon_password;
    updateMutation.mutate(data);
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none transition-all duration-150";
  const inputStyle = { background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="rounded-xl p-6" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-mono text-[10px] tracking-widest mb-5" style={{ color: "var(--accent)" }}>
        CONNECTION SETTINGS
      </p>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Name", value: form.name, key: "name" },
            { label: "Host", value: form.host, key: "host" },
            { label: "Game Port", value: form.port, key: "port", type: "number" },
            { label: "Query Port", value: form.query_port, key: "query_port", type: "number", placeholder: "e.g. 27015", required: false },
            { label: "RCON Port", value: form.rcon_port, key: "rcon_port", type: "number" },
            { label: "RCON Password", value: form.rcon_password, key: "rcon_password", type: "password", placeholder: "Leave blank to keep current" },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-semibold text-[#8a8271] mb-1.5 uppercase tracking-wider">
                {field.label}
              </label>
              <input
                type={field.type || "text"}
                value={field.value}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                required={field.required !== false && field.key !== "rcon_password"}
                placeholder={field.placeholder}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8271] mb-1.5 uppercase tracking-wider">
              Game Type
            </label>
            <PluginSelect
              value={form.game_type}
              onChange={(v) => setForm({ ...form, game_type: v })}
              inputCls={inputCls}
              inputStyle={inputStyle}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5 inline mr-1" />
            {updateMutation.isPending ? "SAVING…" : "SAVE CHANGES"}
          </button>
          {saved && <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>saved</span>}
          {updateMutation.isError && (
            <span className="font-mono text-xs" style={{ color: "var(--danger)" }}>failed to save</span>
          )}
        </div>
      </form>

      <div className="mt-8 pt-5" style={{ borderTop: "1px solid rgba(217,107,92,0.25)" }}>
        <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: "var(--danger)" }}>
          DANGER ZONE
        </p>
        <p className="font-mono text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
          type server name <strong style={{ color: "var(--text-primary)" }}>{server.name}</strong> to confirm deletion
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder={server.name}
            className={inputCls}
            style={{ ...inputStyle, maxWidth: 280 }}
          />
          <button
            type="button"
            disabled={confirmDelete !== server.name || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            className="btn-danger disabled:opacity-40"
          >
            {deleteMutation.isPending ? "DELETING…" : "DELETE SERVER"}
          </button>
        </div>
        {deleteMutation.isError && (
          <p className="mt-2 font-mono text-xs" style={{ color: "var(--danger)" }}>
            {(deleteMutation.error as Error)?.message || "Delete failed"}
          </p>
        )}
      </div>
    </div>
  );
}
