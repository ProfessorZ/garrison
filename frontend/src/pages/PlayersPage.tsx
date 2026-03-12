import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Wifi,
  Ban,
  Clock,
  ChevronDown,
} from "lucide-react";
import { knownPlayersApi } from "../api/knownPlayers";
import { serversApi } from "../api/servers";

function formatPlaytime(seconds: number): string {
  if (seconds < 60) return "<1m";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

type SortField = "last_seen" | "first_seen" | "total_playtime_seconds" | "session_count" | "name";
type StatusFilter = "all" | "online" | "banned";

export default function PlayersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("last_seen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [serverId, setServerId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const isSearching = debouncedSearch.length > 0;

  const { data: servers } = useQuery({
    queryKey: ["servers-list"],
    queryFn: () => serversApi.list(),
  });

  const { data, isLoading } = useQuery({
    queryKey: isSearching
      ? ["players-search", debouncedSearch, page]
      : ["players-list", page, sortBy, sortDir, status, serverId],
    queryFn: () =>
      isSearching
        ? knownPlayersApi.search(debouncedSearch, page)
        : knownPlayersApi.list({ page, sort_by: sortBy, sort_dir: sortDir, status, server_id: serverId }),
    placeholderData: (prev) => prev,
  });

  const players = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleStatusChange = (s: StatusFilter) => {
    setStatus(s);
    setPage(1);
  };

  const handleServerChange = (id: number | undefined) => {
    setServerId(id);
    setPage(1);
  };

  const filterTabs: { key: StatusFilter; label: string; icon: typeof Users }[] = [
    { key: "all", label: "All Players", icon: Users },
    { key: "online", label: "Online", icon: Wifi },
    { key: "banned", label: "Banned", icon: Ban },
  ];

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider cursor-pointer select-none hover:text-[#e2e8f0] transition-colors"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortBy === field ? "text-[#00d4aa]" : ""}`} />
      </span>
    </th>
  );

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Players</h2>
          <p className="text-[#64748b] mt-2">
            {total} known player{total !== 1 ? "s" : ""} tracked
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b] pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players by name..."
          className="w-full rounded-xl pl-11 pr-4 py-3 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
      </div>

      {/* Filter tabs + server dropdown */}
      <div className="flex items-center justify-between mb-5">
        <div
          className="flex gap-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {filterTabs.map((t) => {
            const Icon = t.icon;
            const active = status === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleStatusChange(t.key)}
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
                {!isSearching && (
                  <span
                    className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 tabular-nums ${
                      active
                        ? "bg-[rgba(0,212,170,0.1)] text-[#00d4aa]"
                        : "bg-[rgba(255,255,255,0.04)] text-[#64748b]"
                    }`}
                  >
                    {active ? total : "·"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Server filter */}
        <div className="relative">
          <select
            value={serverId ?? ""}
            onChange={(e) => handleServerChange(e.target.value ? Number(e.target.value) : undefined)}
            className="appearance-none rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-[#e2e8f0] focus:outline-none cursor-pointer transition-all duration-150"
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <option value="">All Servers</option>
            {(servers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#64748b] pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {isLoading && players.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-8 w-8 text-[#1a1f2e] mb-3" />
            <p className="text-sm text-[#94a3b8]">
              {isSearching ? "No players found" : status === "online" ? "No players online" : status === "banned" ? "No banned players" : "No players tracked yet"}
            </p>
            <p className="text-xs text-[#64748b] mt-1">
              {isSearching
                ? "Try a different search term"
                : status === "all"
                  ? "Players will appear here as they connect to your servers"
                  : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <SortHeader field="name">Player</SortHeader>
                    <SortHeader field="first_seen">First Seen</SortHeader>
                    <SortHeader field="last_seen">Last Seen</SortHeader>
                    <SortHeader field="total_playtime_seconds">Playtime</SortHeader>
                    <SortHeader field="session_count">Sessions</SortHeader>
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/players/${p.id}`)}
                      className="cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: i % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent",
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#e2e8f0] shrink-0"
                            style={{ background: "#1a1f2e" }}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-[#e2e8f0]">{p.name}</span>
                            {p.is_banned && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#ff4757] bg-[rgba(255,71,87,0.08)]">
                                <Ban className="h-2.5 w-2.5" />
                                BANNED
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#64748b]">{formatDate(p.first_seen)}</td>
                      <td className="px-5 py-3.5 text-xs text-[#64748b]" title={formatDate(p.last_seen)}>
                        {relativeTime(p.last_seen)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#94a3b8] font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#64748b]" />
                          {formatPlaytime(p.total_playtime_seconds)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#94a3b8] tabular-nums">{p.session_count}</td>
                      <td className="px-5 py-3.5">
                        {p.is_online ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#00d4aa] bg-[rgba(0,212,170,0.08)]">
                            <Wifi className="h-2.5 w-2.5" />
                            ONLINE
                            {p.current_server_name && (
                              <span className="text-[#64748b] font-normal ml-0.5">
                                — {p.current_server_name}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#64748b] bg-[rgba(255,255,255,0.03)]">
                            OFFLINE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-xs text-[#64748b]">
                  Page {page} of {pages} ({total} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#e2e8f0] disabled:opacity-30 transition-all duration-150"
                    style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <ChevronLeft className="h-3 w-3" /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page >= pages}
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
    </div>
  );
}
