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

const ACTION_CONFIG: Record<string, { icon: typeof Terminal; color: string; label: string }> = {
  COMMAND: { icon: Terminal, color: "#3b82f6", label: "RCON" },
  KICK: { icon: UserX, color: "#ffa502", label: "Kick" },
  BAN: { icon: Ban, color: "#ff4757", label: "Ban" },
  SERVER_START: { icon: Power, color: "#00d4aa", label: "Start" },
  SERVER_STOP: { icon: PowerOff, color: "#ff4757", label: "Stop" },
  SERVER_CREATE: { icon: Plus, color: "#00d4aa", label: "Add" },
  SERVER_UPDATE: { icon: Pencil, color: "#3b82f6", label: "Update" },
  SERVER_DELETE: { icon: Trash2, color: "#ff4757", label: "Delete" },
  SCHEDULER_CREATE: { icon: Clock, color: "#a855f7", label: "Schedule" },
  SCHEDULER_UPDATE: { icon: Pencil, color: "#a855f7", label: "Schedule" },
};

const ACTION_TYPES: { value: ActivityAction; label: string }[] = [
  { value: "COMMAND", label: "RCON Command" },
  { value: "KICK", label: "Kick" },
  { value: "BAN", label: "Ban" },
  { value: "SERVER_START", label: "Server Start" },
  { value: "SERVER_STOP", label: "Server Stop" },
  { value: "SERVER_CREATE", label: "Server Added" },
  { value: "SERVER_UPDATE", label: "Server Updated" },
  { value: "SERVER_DELETE", label: "Server Deleted" },
  { value: "SCHEDULER_CREATE", label: "Scheduler Created" },
  { value: "SCHEDULER_UPDATE", label: "Scheduler Updated" },
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
      {!compact && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748b]" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as ActivityAction | "")}
              className="appearance-none rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#e2e8f0] focus:outline-none transition-all duration-150"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <option value="">All actions</option>
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-8 w-8 text-[#1a1f2e] mx-auto mb-2" />
          <p className="text-sm text-[#94a3b8]">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-px">
          {entries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} compact={compact} />
          ))}
        </div>
      )}

      {compact && entries.length > 0 && (
        <Link
          to="/activity"
          className="block text-center text-xs text-[#00d4aa] hover:text-[#00b894] mt-4 py-2 rounded-lg transition-all duration-150 font-semibold"
          style={{ background: "rgba(0,212,170,0.04)" }}
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
    color: "#64748b",
    label: entry.action,
  };
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 ${
        compact ? "py-2.5" : "py-3 px-3 rounded-lg"
      } transition-colors`}
      style={!compact ? { background: "transparent" } : {}}
      onMouseEnter={(e) => { if (!compact) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={(e) => { if (!compact) e.currentTarget.style.background = "transparent"; }}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ background: "#1a1f2e", color: config.color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#e2e8f0] leading-snug">
          <span className="font-bold">{entry.username ?? "System"}</span>{" "}
          <span className="text-[#94a3b8]">{entry.detail}</span>
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.server_name && (
            <>
              <span className="text-xs text-[#64748b]">{entry.server_name}</span>
              <span className="text-[rgba(255,255,255,0.08)]">&middot;</span>
            </>
          )}
          <span className="text-xs text-[#64748b]" style={{ fontFamily: "var(--font-mono)" }}>
            {relativeTime(entry.created_at)}
          </span>
        </div>
      </div>
      {!compact && (
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "#1a1f2e", color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
