import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Shield,
  Ban,
  FileText,
  Wifi,
  List,
  ChevronLeft,
  ChevronRight,
  Server,
  Calendar,
  Hash,
  AlertTriangle,
  History,
  X,
  ExternalLink,
  ShieldAlert,
  Eye,
  EyeOff,
  Users,
  Send,
  Trash2,
  ChevronDown,
  Crosshair,
  Skull,
} from "lucide-react";
import { knownPlayersApi } from "../api/knownPlayers";
import { banListsApi } from "../api/banLists";
import { banTemplatesApi } from "../api/banTemplates";
import { eventsApi } from "../api/events";
import type { BanTemplate } from "../types";

function formatPlaytime(seconds: number): string {
  if (seconds < 60) return "<1m";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatDate(iso?: string): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "\u2014";
  return formatPlaytime(seconds);
}

function relativeTime(iso?: string): string {
  if (!iso) return "\u2014";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

type Tab = "sessions" | "bans" | "notes" | "alts" | "steam" | "names";

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="h-4 w-28 rounded bg-[#1a1f2e] animate-pulse mb-5" />
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[#1a1f2e] animate-pulse shrink-0" />
          <div className="flex-1">
            <div className="h-7 w-48 rounded bg-[#1a1f2e] animate-pulse mb-2" />
            <div className="h-3 w-32 rounded bg-[#1a1f2e] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="h-3 w-16 rounded bg-[#1a1f2e] animate-pulse mb-3" />
            <div className="h-6 w-12 rounded bg-[#1a1f2e] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const id = Number(playerId);

  const [tab, setTab] = useState<Tab>("sessions");
  const [sessionPage, setSessionPage] = useState(1);
  const [banReason, setBanReason] = useState("");
  const [banDurationHours, setBanDurationHours] = useState<string>("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [showBanListModal, setShowBanListModal] = useState(false);
  const [selectedBanListId, setSelectedBanListId] = useState<number | "">("");
  const [noteText, setNoteText] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["player-profile", id],
    queryFn: () => knownPlayersApi.getProfile(id),
    enabled: !isNaN(id),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["player-sessions", id, sessionPage],
    queryFn: () => knownPlayersApi.getSessions(id, sessionPage),
    enabled: !isNaN(id) && tab === "sessions",
  });

  const { data: bans } = useQuery({
    queryKey: ["player-bans", id],
    queryFn: () => knownPlayersApi.getBans(id),
    enabled: !isNaN(id) && tab === "bans",
  });

  const { data: playerNotes = [] } = useQuery({
    queryKey: ["player-notes", id],
    queryFn: () => knownPlayersApi.listNotes(id),
    enabled: !isNaN(id) && tab === "notes",
  });

  const { data: altAccounts = [] } = useQuery({
    queryKey: ["player-alts", id],
    queryFn: () => knownPlayersApi.getAlts(id),
    enabled: !isNaN(id) && tab === "alts",
  });

  const { data: banTemplates = [] } = useQuery({
    queryKey: ["ban-templates"],
    queryFn: banTemplatesApi.list,
    enabled: showBanForm,
  });

  const banMutation = useMutation({
    mutationFn: () => {
      const durationStr = banDurationHours.trim();
      let expires_at: string | undefined;
      if (durationStr) {
        const hours = Number(durationStr);
        if (!isNaN(hours) && hours > 0) {
          expires_at = new Date(Date.now() + hours * 3600000).toISOString();
        }
      }
      return knownPlayersApi.ban(id, { reason: banReason || undefined, expires_at });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["player-bans", id] });
      setShowBanForm(false);
      setBanReason("");
      setBanDurationHours("");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: () => knownPlayersApi.unban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["player-bans", id] });
    },
  });

  const { data: banLists = [] } = useQuery({
    queryKey: ["ban-lists"],
    queryFn: banListsApi.list,
  });

  const addToBanListMutation = useMutation({
    mutationFn: () =>
      banListsApi.addEntry(Number(selectedBanListId), {
        player_name: profile?.player?.name ?? "",
        player_id: id,
        reason: "Added from player profile",
      }),
    onSuccess: () => {
      setShowBanListModal(false);
      setSelectedBanListId("");
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (text: string) => knownPlayersApi.createNote(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-notes", id] });
      setNoteText("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => knownPlayersApi.deleteNote(id, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-notes", id] });
    },
  });

  const applyTemplate = (t: BanTemplate) => {
    setBanReason(t.reason_template);
    setBanDurationHours(t.duration_hours != null ? String(t.duration_hours) : "");
  };

  if (isLoading || !profile) {
    return <ProfileSkeleton />;
  }

  const player = profile.player;
  const sessions = sessionsData?.items ?? profile.sessions;
  const sessionPages = sessionsData?.pages ?? 1;
  const banList = bans ?? profile.bans;
  const nameHistory = profile.name_history ?? [];
  const serversPlayed = new Set(profile.sessions.map((s) => s.server_id)).size;

  // Combat stats — only fetched if player has a steam_id (used as player_id in events)
  const { data: combatStats } = useQuery({
    queryKey: ["player-combat-stats", player.steam_id],
    queryFn: () => eventsApi.getPlayerCombatStats(player.steam_id!),
    enabled: !!player.steam_id,
  });

  const tabs: { key: Tab; label: string; icon: typeof Clock; badge?: number }[] = [
    { key: "sessions", label: "Sessions", icon: Clock },
    { key: "bans", label: "Bans", icon: Shield, badge: player.ban_count || undefined },
    { key: "notes", label: "Notes", icon: FileText },
    { key: "alts", label: "Alt Accounts", icon: Users },
    { key: "steam", label: "Steam", icon: ExternalLink },
    { key: "names", label: "Name History", icon: History, badge: nameHistory.length > 1 ? nameHistory.length : undefined },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Back */}
      <Link
        to="/players"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#e2e8f0] mb-5 transition-colors font-medium"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to players
      </Link>

      {/* Header */}
      <div
        className="rounded-xl p-6 mb-5"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {/* Avatar */}
            {player.steam_avatar_url ? (
              <img
                src={player.steam_avatar_url}
                alt={player.name}
                className="h-16 w-16 rounded-full shrink-0 object-cover"
                style={{ border: "2px solid rgba(255,255,255,0.06)" }}
              />
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-black text-[#e2e8f0] shrink-0"
                style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1320 100%)" }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black text-[#e2e8f0] truncate">{player.name}</h2>
                {player.steam_persona_name && player.steam_persona_name !== player.name && (
                  <span className="text-sm text-[#64748b]">({player.steam_persona_name})</span>
                )}
                {player.steam_id && (
                  <a
                    href={`https://steamcommunity.com/profiles/${player.steam_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#64748b] hover:text-[#e2e8f0] transition-colors"
                    title="View Steam Profile"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {player.is_online ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[#00d4aa] bg-[rgba(0,212,170,0.08)]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00d4aa] status-online" />
                    Online
                    {player.current_server_name && (
                      <span className="text-[#64748b] font-normal ml-1">
                        — {player.current_server_name}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[#64748b] bg-[rgba(255,255,255,0.03)]">
                    Offline
                  </span>
                )}
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {player.is_banned && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#ff4757] bg-[rgba(255,71,87,0.08)]">
                    <Ban className="h-3 w-3" />
                    BANNED
                  </span>
                )}
                {player.vac_banned && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#ff4757] bg-[rgba(255,71,87,0.08)]">
                    <ShieldAlert className="h-3 w-3" />
                    VAC BAN{(player.vac_ban_count ?? 0) > 1 ? ` (${player.vac_ban_count})` : ""}
                  </span>
                )}
                {player.game_banned && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#ffa502] bg-[rgba(255,165,2,0.08)]">
                    <ShieldAlert className="h-3 w-3" />
                    GAME BAN
                  </span>
                )}
                {player.steam_profile_visibility != null && player.steam_profile_visibility !== 3 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#64748b] bg-[rgba(255,255,255,0.04)]">
                    <EyeOff className="h-3 w-3" />
                    PRIVATE
                  </span>
                )}
              </div>

              {/* Stats row under name */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-[#64748b]">
                <span>First seen {relativeTime(player.first_seen)}</span>
                <span>Last seen {relativeTime(player.last_seen)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {player.is_banned ? (
              <button
                onClick={() => unbanMutation.mutate()}
                disabled={unbanMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#00d4aa] disabled:opacity-50 transition-all duration-150"
                style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.15)" }}
              >
                <Shield className="h-3.5 w-3.5" />
                {unbanMutation.isPending ? "Unbanning..." : "Unban Player"}
              </button>
            ) : (
              <button
                onClick={() => setShowBanForm(!showBanForm)}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#ff4757] transition-all duration-150"
                style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.12)" }}
              >
                <Ban className="h-3.5 w-3.5" />
                Ban Player
              </button>
            )}
            <button
              onClick={() => { setTab("notes"); setNoteText(""); }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#818cf8] transition-all duration-150"
              style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.12)" }}
            >
              <FileText className="h-3.5 w-3.5" />
              Add Note
            </button>
          </div>
        </div>

        {/* Ban form */}
        {showBanForm && (
          <div
            className="mt-4 rounded-lg p-4"
            style={{ background: "#1a1f2e", border: "1px solid rgba(255,71,87,0.12)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#ff4757]" />
                <span className="text-sm font-bold text-[#ff4757]">Ban Player</span>
              </div>
              {banTemplates.length > 0 && (
                <div className="relative">
                  <select
                    onChange={(e) => {
                      const t = banTemplates.find((bt) => bt.id === Number(e.target.value));
                      if (t) applyTemplate(t);
                    }}
                    defaultValue=""
                    className="appearance-none rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-[#e2e8f0] focus:outline-none cursor-pointer"
                    style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <option value="" disabled>Use template...</option>
                    {banTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#64748b] pointer-events-none" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
              />
              <input
                type="number"
                value={banDurationHours}
                onChange={(e) => setBanDurationHours(e.target.value)}
                placeholder="Hours (empty = perm)"
                className="w-44 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                min={1}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => banMutation.mutate()}
                disabled={banMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 transition-all duration-150"
                style={{ background: "#ff4757" }}
              >
                {banMutation.isPending ? "Banning..." : "Confirm Ban"}
              </button>
              <button
                onClick={() => { setShowBanForm(false); setBanReason(""); setBanDurationHours(""); }}
                className="rounded-lg px-4 py-2 text-xs font-medium text-[#94a3b8] transition-all duration-150"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {([
          { label: "First Seen", value: relativeTime(player.first_seen), icon: Calendar, accent: "#818cf8" },
          { label: "Last Seen", value: relativeTime(player.last_seen), icon: Clock, accent: "#00d4aa" },
          { label: "Sessions", value: player.session_count, icon: Hash, accent: "#fbbf24" },
          { label: "Playtime", value: formatPlaytime(player.total_playtime_seconds), icon: Clock, accent: "#f472b6" },
          { label: "Servers", value: serversPlayed, icon: Server, accent: "#38bdf8" },
          ...(combatStats && (combatStats.kills > 0 || combatStats.deaths > 0)
            ? [
                { label: "Kills", value: combatStats.kills, icon: Crosshair, accent: "#ef4444" },
                { label: "Deaths", value: combatStats.deaths, icon: Skull, accent: "#64748b" },
                { label: "K/D", value: combatStats.deaths > 0 ? (combatStats.kills / combatStats.deaths).toFixed(2) : combatStats.kills > 0 ? "\u221e" : "\u2014", icon: Crosshair, accent: "#fbbf24" },
              ]
            : []),
        ] as { label: string; value: string | number; icon: typeof Calendar; accent: string }[]).map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg p-1.5" style={{ background: `${stat.accent}15` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: stat.accent }} />
                </div>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="text-lg font-black text-white tabular-nums truncate">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0 mb-5 overflow-x-auto"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 ${
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
              {t.badge && (
                <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 ${
                  t.key === "bans"
                    ? "bg-[rgba(255,71,87,0.1)] text-[#ff4757]"
                    : "bg-[rgba(0,212,170,0.1)] text-[#00d4aa]"
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={tab}>
        {/* ── Sessions Tab ────────────────────────────── */}
        {tab === "sessions" && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {sessions.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                <p className="text-sm text-[#94a3b8]">No sessions recorded yet</p>
              </div>
            ) : (
              <>
                {/* Timeline view */}
                <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <div className="shrink-0">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center"
                          style={{ background: s.left_at ? "rgba(129,140,248,0.08)" : "rgba(0,212,170,0.08)" }}
                        >
                          <Server className="h-4 w-4" style={{ color: s.left_at ? "#818cf8" : "#00d4aa" }} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#e2e8f0] truncate">
                          {s.server_name || `Server #${s.server_id}`}
                        </p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-[#64748b] mt-0.5">
                          <span>{formatDate(s.joined_at)}</span>
                          {s.left_at ? (
                            <span>— {formatDate(s.left_at)}</span>
                          ) : (
                            <span className="text-[#00d4aa] font-medium">
                              <Wifi className="h-3 w-3 inline mr-0.5" />Active now
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-mono text-[#94a3b8]">
                          {formatDuration(s.duration_seconds)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {sessionPages > 1 && (
                  <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-xs text-[#64748b]">
                      Page {sessionPage} of {sessionPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                        disabled={sessionPage <= 1}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#e2e8f0] disabled:opacity-30 transition-all duration-150"
                        style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <ChevronLeft className="h-3 w-3" /> Prev
                      </button>
                      <button
                        onClick={() => setSessionPage((p) => Math.min(sessionPages, p + 1))}
                        disabled={sessionPage >= sessionPages}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#e2e8f0] disabled:opacity-30 transition-all duration-150"
                        style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        Next <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Bans Tab ────────────────────────────── */}
        {tab === "bans" && (
          <div>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowBanListModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#e2e8f0] transition-all duration-150"
                style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <List className="h-3.5 w-3.5" />
                Add to Ban List
              </button>
            </div>

            {showBanListModal && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#e2e8f0]">Add to Ban List</h4>
                  <button onClick={() => setShowBanListModal(false)} className="text-[#64748b] hover:text-[#e2e8f0]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedBanListId}
                    onChange={(e) => setSelectedBanListId(e.target.value ? Number(e.target.value) : "")}
                    className="flex-1 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none"
                    style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <option value="">Select a ban list...</option>
                    {banLists.map((bl) => (
                      <option key={bl.id} value={bl.id}>{bl.name}{bl.is_global ? " (Global)" : ""}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => addToBanListMutation.mutate()}
                    disabled={!selectedBanListId || addToBanListMutation.isPending}
                    className="rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 shrink-0"
                    style={{ background: "#00d4aa" }}
                  >
                    {addToBanListMutation.isPending ? "Adding..." : "Add"}
                  </button>
                </div>
                {addToBanListMutation.isSuccess && (
                  <p className="text-xs text-[#00d4aa] mt-2">Added to ban list</p>
                )}
              </div>
            )}

            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {banList.length === 0 ? (
                <div className="py-16 text-center">
                  <Shield className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                  <p className="text-sm text-[#94a3b8]">No bans on record</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                  {banList.map((b) => (
                    <div key={b.id} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                b.is_active
                                  ? "text-[#ff4757] bg-[rgba(255,71,87,0.08)]"
                                  : "text-[#64748b] bg-[rgba(255,255,255,0.03)]"
                              }`}
                            >
                              {b.is_active ? "ACTIVE" : "EXPIRED"}
                            </span>
                            {b.server_name && (
                              <span className="text-xs text-[#64748b]">
                                on {b.server_name}
                              </span>
                            )}
                            {!b.server_id && (
                              <span className="text-xs text-[#ffa502]">Global ban</span>
                            )}
                          </div>
                          {b.reason && (
                            <p className="text-sm text-[#e2e8f0] mb-1">{b.reason}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
                            <span>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {formatDate(b.banned_at)}
                            </span>
                            {b.banned_by_username && (
                              <span>by {b.banned_by_username}</span>
                            )}
                            {b.expires_at && (
                              <span>Expires {formatDate(b.expires_at)}</span>
                            )}
                            {!b.is_active && b.unbanned_at && (
                              <span>
                                Unbanned {formatDate(b.unbanned_at)}
                                {b.unbanned_by_username && ` by ${b.unbanned_by_username}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notes Tab ────────────────────────────── */}
        {tab === "notes" && (
          <div>
            {/* Add note form */}
            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <h3 className="text-sm font-bold text-[#e2e8f0] mb-3">Add Note</h3>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a note about this player..."
                rows={3}
                className="w-full rounded-lg px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#64748b] resize-y focus:outline-none mb-3"
                style={{
                  background: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              />
              <button
                onClick={() => { if (noteText.trim()) createNoteMutation.mutate(noteText.trim()); }}
                disabled={!noteText.trim() || createNoteMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
                style={{ background: "#00d4aa" }}
              >
                <Send className="h-3.5 w-3.5" />
                {createNoteMutation.isPending ? "Saving..." : "Add Note"}
              </button>
            </div>

            {/* Notes list */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {playerNotes.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                  <p className="text-sm text-[#94a3b8]">No notes yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                  {playerNotes.map((note) => (
                    <div key={note.id} className="p-5 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-[#e2e8f0]">
                              {note.author_username || "Unknown"}
                            </span>
                            <span className="text-[10px] text-[#64748b]">
                              {relativeTime(note.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-[#94a3b8] whitespace-pre-wrap break-words">
                            {note.text}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          disabled={deleteNoteMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 rounded-md p-1.5 text-[#64748b] hover:text-[#ff4757] hover:bg-[rgba(255,71,87,0.08)] transition-all duration-150 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Alt Accounts Tab ────────────────────────────── */}
        {tab === "alts" && (
          <div>
            {altAccounts.length > 0 && (
              <div
                className="rounded-lg p-3 mb-4 flex items-center gap-2"
                style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}
              >
                <AlertTriangle className="h-4 w-4 text-[#fbbf24] shrink-0" />
                <span className="text-xs text-[#fbbf24] font-medium">
                  {altAccounts.length} potential alt account{altAccounts.length !== 1 ? "s" : ""} detected (shared IP address)
                </span>
              </div>
            )}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {altAccounts.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                  <p className="text-sm text-[#94a3b8]">No alt accounts detected</p>
                  <p className="text-xs text-[#64748b] mt-1">Alt detection is based on shared IP addresses</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                  {altAccounts.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => navigate(`/players/${alt.id}`)}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer"
                    >
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-[#e2e8f0] shrink-0"
                        style={{ background: "#1a1f2e" }}
                      >
                        {alt.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#e2e8f0] truncate">{alt.name}</span>
                          {alt.is_banned && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#ff4757] bg-[rgba(255,71,87,0.08)]">
                              <Ban className="h-2.5 w-2.5" />
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="flex gap-x-3 text-xs text-[#64748b] mt-0.5">
                          <span>{alt.session_count} sessions</span>
                          <span>Last seen {relativeTime(alt.last_seen)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {alt.shared_ips.slice(0, 3).map((ip) => (
                            <span
                              key={ip}
                              className="text-[10px] font-mono text-[#64748b] rounded px-1.5 py-0.5"
                              style={{ background: "rgba(255,255,255,0.04)" }}
                            >
                              {ip}
                            </span>
                          ))}
                          {alt.shared_ips.length > 3 && (
                            <span className="text-[10px] text-[#64748b]">
                              +{alt.shared_ips.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Steam Tab ────────────────────────────── */}
        {tab === "steam" && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {!player.steam_id ? (
              <div className="py-16 text-center">
                <ExternalLink className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                <p className="text-sm text-[#94a3b8]">No Steam profile linked</p>
                <p className="text-xs text-[#64748b] mt-1">Steam data will appear once the player's Steam ID is resolved</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Steam profile summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Steam ID</span>
                    <p className="text-sm text-[#e2e8f0] font-mono mt-1">{player.steam_id}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Profile Visibility</span>
                    <p className="text-sm text-[#e2e8f0] mt-1 flex items-center gap-1.5">
                      {player.steam_profile_visibility === 3 ? (
                        <><Eye className="h-3.5 w-3.5 text-[#00d4aa]" /> Public</>
                      ) : player.steam_profile_visibility === 2 ? (
                        <><EyeOff className="h-3.5 w-3.5 text-[#fbbf24]" /> Friends Only</>
                      ) : (
                        <><EyeOff className="h-3.5 w-3.5 text-[#64748b]" /> Private</>
                      )}
                    </p>
                  </div>
                  {player.steam_persona_name && (
                    <div>
                      <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Persona Name</span>
                      <p className="text-sm text-[#e2e8f0] mt-1">{player.steam_persona_name}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Last Steam Check</span>
                    <p className="text-sm text-[#e2e8f0] mt-1">{player.steam_checked_at ? relativeTime(player.steam_checked_at) : "Never"}</p>
                  </div>
                </div>

                {/* Ban history */}
                <div
                  className="rounded-lg p-4"
                  style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <h4 className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider mb-3">VAC / Game Ban History</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] text-[#64748b]">VAC Bans</span>
                      <p className={`text-lg font-black tabular-nums ${(player.vac_ban_count ?? 0) > 0 ? "text-[#ff4757]" : "text-[#e2e8f0]"}`}>
                        {player.vac_ban_count ?? 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b]">Game Bans</span>
                      <p className={`text-lg font-black tabular-nums ${player.game_banned ? "text-[#ffa502]" : "text-[#e2e8f0]"}`}>
                        {player.game_banned ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b]">Days Since Last Ban</span>
                      <p className="text-lg font-black text-[#e2e8f0] tabular-nums">
                        {(player.days_since_last_ban ?? 0) > 0 ? player.days_since_last_ban : "\u2014"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b]">Status</span>
                      <p className="text-lg font-black tabular-nums">
                        {player.vac_banned || player.game_banned ? (
                          <span className="text-[#ff4757]">Flagged</span>
                        ) : (
                          <span className="text-[#00d4aa]">Clean</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Steam profile link */}
                <a
                  href={`https://steamcommunity.com/profiles/${player.steam_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#e2e8f0] transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]"
                  style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Full Steam Profile
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Name History Tab ────────────────────────────── */}
        {tab === "names" && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {nameHistory.length === 0 ? (
              <div className="py-16 text-center">
                <History className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                <p className="text-sm text-[#94a3b8]">No name history recorded</p>
              </div>
            ) : (
              <div className="p-5">
                <div className="relative">
                  <div
                    className="absolute left-[7px] top-2 bottom-2 w-px"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <div className="space-y-4">
                    {nameHistory.map((entry, i) => (
                      <div key={entry.id} className="relative flex items-start gap-4 pl-6">
                        <div
                          className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 shrink-0"
                          style={{
                            borderColor: i === 0 ? "#00d4aa" : "rgba(255,255,255,0.1)",
                            background: i === 0 ? "rgba(0,212,170,0.15)" : "#111827",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${i === 0 ? "text-[#e2e8f0]" : "text-[#94a3b8]"}`}>
                            {entry.name}
                            {i === 0 && (
                              <span className="ml-2 text-[10px] font-bold text-[#00d4aa] bg-[rgba(0,212,170,0.08)] rounded-full px-2 py-0.5">
                                CURRENT
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[#64748b]">
                            <span>First seen: {formatDate(entry.first_seen_with_name)}</span>
                            <span>Last seen: {formatDate(entry.last_seen_with_name)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
