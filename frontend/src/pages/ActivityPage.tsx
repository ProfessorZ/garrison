import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight,
  Terminal,
  UserX,
  Ban,
  Power,
  PowerOff,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Calendar,
} from "lucide-react";
import { activityApi } from "../api/activity";
import { serversApi } from "../api/servers";
import type { ActivityAction, ActivityEntry } from "../types";

const ACTION_CONFIG: Record<
  ActivityAction,
  { icon: typeof Terminal; color: string; label: string }
> = {
  rcon_command: { icon: Terminal, color: "#67b7e2", label: "RCON" },
  kick: { icon: UserX, color: "#e3b454", label: "Kick" },
  ban: { icon: Ban, color: "#d96b5c", label: "Ban" },
  server_start: { icon: Power, color: "#ffb224", label: "Start" },
  server_stop: { icon: PowerOff, color: "#d96b5c", label: "Stop" },
  server_add: { icon: Plus, color: "#ffb224", label: "Add" },
  server_update: { icon: Pencil, color: "#67b7e2", label: "Update" },
  server_delete: { icon: Trash2, color: "#d96b5c", label: "Delete" },
  scheduler_create: { icon: Clock, color: "#a855f7", label: "Schedule" },
  scheduler_update: { icon: Pencil, color: "#a855f7", label: "Schedule" },
};

const ACTION_TYPES: { value: ActivityAction; label: string }[] = [
  { value: "rcon_command", label: "RCON Command" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "server_start", label: "Server Start" },
  { value: "server_stop", label: "Server Stop" },
  { value: "server_add", label: "Server Added" },
  { value: "server_update", label: "Server Updated" },
  { value: "server_delete", label: "Server Deleted" },
  { value: "scheduler_create", label: "Scheduler Created" },
  { value: "scheduler_update", label: "Scheduler Updated" },
];

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState<ActivityAction | "">("");
  const [filterServer, setFilterServer] = useState<number | "">("");
  const [filterUser, setFilterUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const perPage = 25;

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["activity-page", page, filterAction, filterServer, filterUser, dateFrom, dateTo],
    queryFn: () =>
      activityApi.getActivity({
        page,
        per_page: perPage,
        action: filterAction || undefined,
        server_id: filterServer || undefined,
        user: filterUser || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  });

  const entries = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  const filterInputCls = "rounded-lg px-3 py-2 text-xs text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none transition-all duration-150";
  const filterInputStyle = { background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#e8e3d8]">Activity Log</h2>
        <p className="text-sm text-[#6b6455] mt-1">Track all actions across your servers</p>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-[#6b6455]" />
          <span className="text-[11px] font-bold text-[#e8e3d8] uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value as ActivityAction | ""); setPage(1); }}
            className={filterInputCls}
            style={filterInputStyle}
          >
            <option value="">All actions</option>
            {ACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={filterServer}
            onChange={(e) => { setFilterServer(e.target.value ? Number(e.target.value) : ""); setPage(1); }}
            className={filterInputCls}
            style={filterInputStyle}
          >
            <option value="">All servers</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <input
            value={filterUser}
            onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
            placeholder="Filter by user..."
            className={filterInputCls}
            style={filterInputStyle}
          />

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#6b6455] shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className={`${filterInputCls} flex-1`}
              style={filterInputStyle}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#6b6455] shrink-0">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className={`${filterInputCls} flex-1`}
              style={filterInputStyle}
            />
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="h-10 w-10 text-[#12100b] mx-auto mb-3" />
            <p className="text-sm text-[#8a8271]">No activity found</p>
            <p className="text-xs text-[#6b6455] mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div>
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs text-[#6b6455]" style={{ fontFamily: "var(--font-mono)" }}>
            Page {page} of {totalPages} &middot; {data?.total ?? 0} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e8e3d8] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e8e3d8] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const config = ACTION_CONFIG[entry.action] ?? {
    icon: Activity,
    color: "#6b6455",
    label: entry.action,
  };
  const Icon = config.icon;

  return (
    <div
      className="flex items-start gap-3 px-5 py-3.5 transition-colors"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "#12100b", color: config.color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#e8e3d8] leading-snug">
          <span className="font-bold">{(entry.username ?? "System")}</span>{" "}
          <span className="text-[#8a8271]">{entry.detail}</span>
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.server_name && (
            <>
              <span className="text-xs text-[#6b6455]">{entry.server_name}</span>
              <span className="text-[rgba(255,255,255,0.08)]">&middot;</span>
            </>
          )}
          <span className="text-xs text-[#6b6455]" style={{ fontFamily: "var(--font-mono)" }}>
            {relativeTime(entry.created_at)}
          </span>
        </div>
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: "#12100b", color: config.color }}
      >
        {config.label}
      </span>
    </div>
  );
}
