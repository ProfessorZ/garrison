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
  rcon_command: { icon: Terminal, color: "text-blue-400", label: "RCON" },
  kick: { icon: UserX, color: "text-amber-400", label: "Kick" },
  ban: { icon: Ban, color: "text-red-400", label: "Ban" },
  server_start: { icon: Power, color: "text-emerald-400", label: "Start" },
  server_stop: { icon: PowerOff, color: "text-red-400", label: "Stop" },
  server_add: { icon: Plus, color: "text-emerald-400", label: "Add" },
  server_update: { icon: Pencil, color: "text-blue-400", label: "Update" },
  server_delete: { icon: Trash2, color: "text-red-400", label: "Delete" },
  scheduler_create: { icon: Clock, color: "text-purple-400", label: "Schedule" },
  scheduler_update: { icon: Pencil, color: "text-purple-400", label: "Schedule" },
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
    queryKey: [
      "activity-page",
      page,
      filterAction,
      filterServer,
      filterUser,
      dateFrom,
      dateTo,
    ],
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

  const inputClass =
    "rounded-md bg-slate-700 border border-slate-600 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100">Activity Log</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Track all actions across your servers
        </p>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value as ActivityAction | "");
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">All actions</option>
            {ACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={filterServer}
            onChange={(e) => {
              setFilterServer(
                e.target.value ? Number(e.target.value) : ""
              );
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">All servers</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            value={filterUser}
            onChange={(e) => {
              setFilterUser(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by user..."
            className={inputClass}
          />

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className={`${inputClass} flex-1`}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 shrink-0">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className={`${inputClass} flex-1`}
            />
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No activity found</p>
            <p className="text-xs text-slate-600 mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} &middot; {data?.total ?? 0} total
            entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
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
    color: "text-slate-400",
    label: entry.action,
  };
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700/80 ${config.color}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200 leading-snug">
          <span className="font-medium text-slate-100">{entry.user}</span>{" "}
          {entry.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.server_name && (
            <>
              <span className="text-xs text-slate-500">
                {entry.server_name}
              </span>
              <span className="text-slate-700">&middot;</span>
            </>
          )}
          <span className="text-xs text-slate-600">
            {relativeTime(entry.created_at)}
          </span>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} bg-slate-700/80`}
      >
        {config.label}
      </span>
    </div>
  );
}
