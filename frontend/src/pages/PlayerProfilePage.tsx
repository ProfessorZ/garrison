import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { knownPlayersApi } from "../api/knownPlayers";
import { banListsApi } from "../api/banLists";

function formatPlaytime(seconds: number): string {
  if (seconds < 60) return "<1m";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  return formatPlaytime(seconds);
}

type Tab = "sessions" | "bans" | "notes" | "names";

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="h-4 w-28 rounded bg-[#1a1f2e] animate-pulse mb-5" />
      {/* Header skeleton */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[#1a1f2e] animate-pulse shrink-0" />
          <div className="flex-1">
            <div className="h-6 w-48 rounded bg-[#1a1f2e] animate-pulse mb-2" />
            <div className="h-3 w-32 rounded bg-[#1a1f2e] animate-pulse" />
          </div>
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
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
  const id = Number(playerId);

  const [tab, setTab] = useState<Tab>("sessions");
  const [sessionPage, setSessionPage] = useState(1);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [showBanListModal, setShowBanListModal] = useState(false);
  const [selectedBanListId, setSelectedBanListId] = useState<number | "">("");

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

  useEffect(() => {
    if (profile?.player?.notes != null) {
      setNotes(profile.player.notes);
    }
  }, [profile?.player?.notes]);

  const notesMutation = useMutation({
    mutationFn: (text: string) => knownPlayersApi.updateNotes(id, text),
    onSuccess: () => {
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    },
  });

  const banMutation = useMutation({
    mutationFn: () => knownPlayersApi.ban(id, { reason: banReason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["player-bans", id] });
      setShowBanForm(false);
      setBanReason("");
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

  // Auto-save notes with debounce
  const saveNotes = useCallback(
    (text: string) => {
      notesMutation.mutate(text);
    },
    [notesMutation.mutate]
  );

  useEffect(() => {
    if (profile?.player?.notes === notes) return;
    if (notes === "" && !profile?.player?.notes) return;
    const t = setTimeout(() => saveNotes(notes), 1000);
    return () => clearTimeout(t);
  }, [notes]);

  if (isLoading || !profile) {
    return <ProfileSkeleton />;
  }

  const player = profile.player;
  const sessions = sessionsData?.items ?? profile.sessions;
  const sessionPages = sessionsData?.pages ?? 1;
  const banList = bans ?? profile.bans;
  const nameHistory = profile.name_history ?? [];

  const tabs: { key: Tab; label: string; icon: typeof Clock }[] = [
    { key: "sessions", label: "Sessions", icon: Clock },
    { key: "bans", label: "Bans", icon: Shield },
    { key: "notes", label: "Notes", icon: FileText },
    { key: "names", label: "Name History", icon: History },
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
        className="rounded-xl p-6 mb-6"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-[#e2e8f0] shrink-0"
                style={{ background: "#1a1f2e" }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-bold text-[#e2e8f0]">{player.name}</h2>
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
                  {player.is_banned && (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-[#ff4757] bg-[rgba(255,71,87,0.08)]">
                      <Ban className="h-3 w-3" />
                      BANNED
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748b] mt-1">
                  First seen {formatDate(player.first_seen)}
                </p>
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
          </div>
        </div>

        {/* Ban form */}
        {showBanForm && (
          <div
            className="mt-4 rounded-lg p-4"
            style={{ background: "#1a1f2e", border: "1px solid rgba(255,71,87,0.12)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-[#ff4757]" />
              <span className="text-sm font-bold text-[#ff4757]">Ban Player</span>
            </div>
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] mb-3 focus:outline-none"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            />
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
                onClick={() => { setShowBanForm(false); setBanReason(""); }}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Sessions", value: player.session_count, icon: Hash, accent: "#00d4aa" },
          { label: "Playtime", value: formatPlaytime(player.total_playtime_seconds), icon: Clock, accent: "#818cf8" },
          {
            label: "Servers",
            value: new Set(profile.sessions.map((s) => s.server_id)).size,
            icon: Server,
            accent: "#fbbf24",
          },
          { label: "Bans", value: player.ban_count, icon: Ban, accent: "#ff4757" },
        ].map((stat) => {
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
              <p className="text-xl font-black text-white tabular-nums">{stat.value}</p>
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
              {t.key === "bans" && player.ban_count > 0 && (
                <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5 bg-[rgba(255,71,87,0.1)] text-[#ff4757]">
                  {player.ban_count}
                </span>
              )}
              {t.key === "names" && nameHistory.length > 1 && (
                <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5 bg-[rgba(0,212,170,0.1)] text-[#00d4aa]">
                  {nameHistory.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={tab}>
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Server</th>
                        <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Joined</th>
                        <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Left</th>
                        <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr
                          key={s.id}
                          className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                            background: i % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent",
                          }}
                        >
                          <td className="px-5 py-3 text-sm text-[#e2e8f0] font-medium">
                            {s.server_name || `Server #${s.server_id}`}
                          </td>
                          <td className="px-5 py-3 text-xs text-[#64748b]">{formatDate(s.joined_at)}</td>
                          <td className="px-5 py-3 text-xs text-[#64748b]">
                            {s.left_at ? formatDate(s.left_at) : (
                              <span className="inline-flex items-center gap-1 text-[#00d4aa]">
                                <Wifi className="h-3 w-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-[#94a3b8] font-mono">
                            {formatDuration(s.duration_seconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

        {tab === "bans" && (
          <div>
            {/* Add to ban list button */}
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

            {/* Ban list modal */}
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

        {tab === "notes" && (
          <div
            className="rounded-xl p-5"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#e2e8f0]">Admin Notes</h3>
              {notesSaved && (
                <span className="text-xs text-[#00d4aa] font-medium animate-fade-in">Saved</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this player..."
              rows={8}
              className="w-full rounded-lg px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#64748b] resize-y focus:outline-none"
              style={{
                background: "#1a1f2e",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <p className="text-[11px] text-[#64748b] mt-2">Auto-saves after 1 second of inactivity</p>
          </div>
        )}

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
                  {/* Timeline line */}
                  <div
                    className="absolute left-[7px] top-2 bottom-2 w-px"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <div className="space-y-4">
                    {nameHistory.map((entry, i) => (
                      <div key={entry.id} className="relative flex items-start gap-4 pl-6">
                        {/* Timeline dot */}
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
