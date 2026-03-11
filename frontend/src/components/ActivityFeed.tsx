import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Terminal,
  UserX,
  Ban,
  Power,
  PowerOff,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Filter,
  Activity,
} from "lucide-react";
import { activityApi } from "../api/activity";
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

interface ActivityFeedProps {
  compact?: boolean;
  limit?: number;
  serverId?: number;
}

export default function ActivityFeed({
  compact = false,
  limit = 10,
  serverId,
}: ActivityFeedProps) {
  const [filterAction, setFilterAction] = useState<ActivityAction | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["activity", serverId, filterAction, limit],
    queryFn: () =>
      serverId
        ? activityApi.getServerActivity(serverId, 1, limit)
        : activityApi.getActivity({
            action: filterAction || undefined,
            per_page: limit,
          }),
    refetchInterval: 30000,
  });

  const entries = data?.items ?? [];

  return (
    <div>
      {/* Header with filter */}
      {!compact && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <select
              value={filterAction}
              onChange={(e) =>
                setFilterAction(e.target.value as ActivityAction | "")
              }
              className="appearance-none rounded-md bg-slate-700 border border-slate-600 pl-9 pr-8 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All actions</option>
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Entries */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-px">
          {entries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} compact={compact} />
          ))}
        </div>
      )}

      {/* "View all" link for compact mode */}
      {compact && entries.length > 0 && (
        <Link
          to="/activity"
          className="block text-center text-xs text-emerald-400 hover:text-emerald-300 mt-3 py-2 rounded-md hover:bg-slate-700/50 transition-colors"
        >
          View all activity &rarr;
        </Link>
      )}
    </div>
  );
}

function ActivityRow({
  entry,
  compact,
}: {
  entry: ActivityEntry;
  compact: boolean;
}) {
  const config = ACTION_CONFIG[entry.action] ?? {
    icon: Activity,
    color: "text-slate-400",
    label: entry.action,
  };
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 ${
        compact ? "py-2" : "py-2.5 px-3 rounded-md hover:bg-slate-800/50"
      }`}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 ${config.color}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200 leading-snug">
          <span className="font-medium text-slate-100">{entry.user}</span>{" "}
          {entry.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.server_name && (
            <>
              <span className="text-xs text-slate-500">{entry.server_name}</span>
              <span className="text-slate-700">&middot;</span>
            </>
          )}
          <span className="text-xs text-slate-600">
            {relativeTime(entry.created_at)}
          </span>
        </div>
      </div>
      {!compact && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${config.color} bg-slate-800`}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
