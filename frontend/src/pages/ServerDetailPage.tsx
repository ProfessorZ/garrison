import { useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { serversApi } from "../api/servers";
import { useAuth } from "../contexts/AuthContext";
import RconConsole from "../components/RconConsole";
import PlayerList from "../components/PlayerList";
import ChatLog from "../components/ChatLog";
import ActivityFeed from "../components/ActivityFeed";
import ServerPermissions from "../components/ServerPermissions";
import ScheduleManager from "../components/ScheduleManager";
import ServerOptions from "../components/ServerOptions";

type Tab = "console" | "players" | "chat" | "schedules" | "options" | "activity" | "settings" | "permissions";

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const serverId = Number(id);

  const [tab, setTab] = useState<Tab>("console");

  const { data: server, isLoading: serverLoading } = useQuery({
    queryKey: ["server", serverId],
    queryFn: () => serversApi.get(serverId),
    enabled: !isNaN(serverId),
  });

  const { data: status } = useQuery({
    queryKey: ["server-status", serverId],
    queryFn: () => serversApi.getStatus(serverId),
    enabled: !isNaN(serverId),
    refetchInterval: 15000,
  });

  if (serverLoading || !server) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  const isOnline = status?.online ?? false;
  const playerCount = status?.player_count;
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const tabs: { key: Tab; label: string; icon: typeof Terminal; adminOnly?: boolean }[] = [
    { key: "console", label: "Console", icon: Terminal },
    { key: "players", label: "Players", icon: Users },
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "schedules", label: "Schedules", icon: Clock },
    { key: "options", label: "Options", icon: SlidersHorizontal },
    { key: "activity", label: "Activity", icon: Activity },
    { key: "settings", label: "Settings", icon: Settings, adminOnly: true },
    { key: "permissions", label: "Access", icon: Shield, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#e2e8f0] mb-5 transition-colors font-medium"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to servers
      </Link>

      {/* Server header */}
      <div className="rounded-xl p-6 mb-6" style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#e2e8f0] truncate">
                {server.name}
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shrink-0"
                style={{
                  background: status === undefined
                    ? "#1a1f2e"
                    : isOnline
                      ? "rgba(0,212,170,0.08)"
                      : "rgba(255,71,87,0.08)",
                  color: status === undefined
                    ? "#64748b"
                    : isOnline
                      ? "#00d4aa"
                      : "#ff4757",
                }}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    status === undefined
                      ? "bg-[#64748b] animate-pulse"
                      : isOnline
                        ? "bg-[#00d4aa] status-online"
                        : "bg-[#ff4757]"
                  }`}
                />
                {status === undefined ? "Checking" : isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <span className="font-mono text-[#94a3b8]">{server.host}:{server.port}</span>
              <span className="text-[rgba(255,255,255,0.12)]">&middot;</span>
              <span>RCON :{server.rcon_port}</span>
              <span className="text-[rgba(255,255,255,0.12)]">&middot;</span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "#1a1f2e" }}>
                {server.game_type}
              </span>
            </div>
          </div>

          {isOnline && playerCount != null && (
            <div className="flex items-center gap-2.5 rounded-xl px-5 py-3 shrink-0"
              style={{ background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.1)" }}>
              <Users className="h-4 w-4 text-[#00d4aa]" />
              <span className="text-2xl font-bold gradient-text">{playerCount}</span>
              <span className="text-xs text-[#64748b] font-medium">online</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs — underline style */}
      <div className="flex gap-0 mb-5 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 relative ${
                active ? "text-[#00d4aa]" : "text-[#64748b] hover:text-[#e2e8f0]"
              }`}
              style={{
                background: "transparent",
                borderRadius: 0,
                borderBottom: active ? "2px solid #00d4aa" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={tab}>
        {tab === "console" && (
          <RconConsole serverId={serverId} gameType={server.game_type} />
        )}
        {tab === "players" && <PlayerList serverId={serverId} />}
        {tab === "chat" && <ChatLog serverId={serverId} />}
        {tab === "schedules" && (
          <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <ScheduleManager serverId={serverId} />
          </div>
        )}
        {tab === "options" && <ServerOptions serverId={serverId} />}
        {tab === "activity" && (
          <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <ActivityFeed serverId={serverId} limit={25} />
          </div>
        )}
        {tab === "settings" && (
          <SettingsPanel
            serverId={serverId}
            server={server}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["server", serverId] })}
          />
        )}
        {tab === "permissions" && isAdmin && (
          <ServerPermissions serverId={serverId} />
        )}
      </div>
    </div>
  );
}

// ---------- Settings Panel ----------

interface SettingsPanelProps {
  serverId: number;
  server: { name: string; host: string; port: number; rcon_port: number; game_type: string };
  onSaved: () => void;
}

function SettingsPanel({ serverId, server, onSaved }: SettingsPanelProps) {
  const [form, setForm] = useState({
    name: server.name,
    host: server.host,
    port: String(server.port),
    rcon_port: String(server.rcon_port),
    rcon_password: "",
    game_type: server.game_type,
  });

  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof serversApi.update>[1]) =>
      serversApi.update(serverId, data),
    onSuccess: () => {
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: Record<string, string | number> = {
      name: form.name,
      host: form.host,
      port: parseInt(form.port),
      rcon_port: parseInt(form.rcon_port),
      game_type: form.game_type,
    };
    if (form.rcon_password) data.rcon_password = form.rcon_password;
    updateMutation.mutate(data);
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="rounded-xl p-6" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
      <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider mb-5">
        Server Settings
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Name", value: form.name, key: "name" },
            { label: "Host", value: form.host, key: "host" },
            { label: "Game Port", value: form.port, key: "port", type: "number" },
            { label: "RCON Port", value: form.rcon_port, key: "rcon_port", type: "number" },
            { label: "RCON Password", value: form.rcon_password, key: "rcon_password", type: "password", placeholder: "Leave blank to keep current" },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                {field.label}
              </label>
              <input
                type={field.type || "text"}
                value={field.value}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                required={field.key !== "rcon_password"}
                placeholder={field.placeholder}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
              Game Type
            </label>
            <select
              value={form.game_type}
              onChange={(e) => setForm({ ...form, game_type: e.target.value })}
              className={inputCls}
              style={inputStyle}
            >
              <option value="zomboid">Project Zomboid</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
            style={{ background: "#00d4aa" }}
          >
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {saved && <span className="text-sm text-[#00d4aa] font-medium animate-fade-in">Saved!</span>}
          {updateMutation.isError && <span className="text-sm text-[#ff4757]">Failed to save.</span>}
        </div>
      </form>
    </div>
  );
}
