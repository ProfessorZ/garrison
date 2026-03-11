import { useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Terminal,
  Users,
  Settings,
  Save,
  Wifi,
  WifiOff,
  MessageSquare,
  Activity,
  Shield,
} from "lucide-react";
import { serversApi } from "../api/servers";
import { useAuth } from "../contexts/AuthContext";
import RconConsole from "../components/RconConsole";
import PlayerList from "../components/PlayerList";
import ChatLog from "../components/ChatLog";
import ActivityFeed from "../components/ActivityFeed";
import ServerPermissions from "../components/ServerPermissions";

type Tab = "console" | "players" | "chat" | "activity" | "settings" | "permissions";

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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
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
    { key: "activity", label: "Activity", icon: Activity },
    { key: "settings", label: "Settings", icon: Settings },
    { key: "permissions", label: "Access", icon: Shield, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div>
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to servers
      </Link>

      {/* Server header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-100 truncate">
                {server.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                  status === undefined
                    ? "bg-slate-700 text-slate-400"
                    : isOnline
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                }`}
              >
                {status === undefined ? (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                    Checking...
                  </>
                ) : isOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </>
                )}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1.5">
              {server.host}:{server.port} &middot; RCON :{server.rcon_port}{" "}
              &middot; {server.game_type}
              {isOnline && playerCount !== null && playerCount !== undefined && (
                <span className="text-slate-400">
                  {" "}
                  &middot; {playerCount} player
                  {playerCount !== 1 ? "s" : ""} online
                </span>
              )}
            </p>
          </div>

          {isOnline && playerCount !== null && playerCount !== undefined && (
            <div className="flex items-center gap-2 bg-emerald-500/10 rounded-lg px-4 py-2 shrink-0">
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="text-lg font-bold text-emerald-400">
                {playerCount}
              </span>
              <span className="text-xs text-emerald-400/70">online</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-700 pb-px overflow-x-auto">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                tab === t.key
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "console" && (
        <RconConsole serverId={serverId} gameType={server.game_type} />
      )}
      {tab === "players" && <PlayerList serverId={serverId} />}
      {tab === "chat" && <ChatLog serverId={serverId} />}
      {tab === "activity" && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <ActivityFeed serverId={serverId} limit={25} />
        </div>
      )}
      {tab === "settings" && (
        <SettingsPanel
          serverId={serverId}
          server={server}
          onSaved={() =>
            queryClient.invalidateQueries({ queryKey: ["server", serverId] })
          }
        />
      )}
      {tab === "permissions" && isAdmin && (
        <ServerPermissions serverId={serverId} />
      )}
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
    if (form.rcon_password) {
      data.rcon_password = form.rcon_password;
    }
    updateMutation.mutate(data);
  };

  const inputClass =
    "w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">
        Server Settings
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Host
            </label>
            <input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Game Port
            </label>
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              RCON Port
            </label>
            <input
              type="number"
              value={form.rcon_port}
              onChange={(e) => setForm({ ...form, rcon_port: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              RCON Password
            </label>
            <input
              type="password"
              value={form.rcon_password}
              onChange={(e) =>
                setForm({ ...form, rcon_password: e.target.value })
              }
              placeholder="Leave blank to keep current"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Game Type
            </label>
            <select
              value={form.game_type}
              onChange={(e) => setForm({ ...form, game_type: e.target.value })}
              className={inputClass}
            >
              <option value="zomboid">Project Zomboid</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400">Settings saved!</span>
          )}
          {updateMutation.isError && (
            <span className="text-sm text-red-400">
              Failed to save settings.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
