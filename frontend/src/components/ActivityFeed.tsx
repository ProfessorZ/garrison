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
  COMMAND: { icon: Terminal, color: "#67b7e2", label: "RCON" },
  KICK: { icon: UserX, color: "#e3b454", label: "Kick" },
  BAN: { icon: Ban, color: "#d96b5c", label: "Ban" },
  SERVER_START: { icon: Power, color: "#ffb224", label: "Start" },
  SERVER_STOP: { icon: PowerOff, color: "#d96b5c", label: "Stop" },
  SERVER_CREATE: { icon: Plus, color: "#ffb224", label: "Add" },
  SERVER_UPDATE: { icon: Pencil, color: "#67b7e2", label: "Update" },
  SERVER_DELETE: { icon: Trash2, color: "#d96b5c", label: "Delete" },
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
        <div className="flex items-center gap-3 mb-4" style={{ paddingTop: 16 }}>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b6455]" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as ActivityAction | "")}
              className="appearance-none rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#e8e3d8] focus:outline-none transition-all duration-150"
              style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
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
          <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full mb-4" style={{ background: "#12100b" }}>
            <Activity className="h-6 w-6 text-[#6b6455]" />
          </div>
          <h4 className="text-sm font-semibold text-[#e8e3d8] mb-1">No activity yet</h4>
          <p className="text-xs text-[#6b6455]">Actions like commands, kicks, and bans will show up here</p>
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
          className="block text-center text-xs text-[#ffb224] hover:text-[#ffc95c] mt-4 py-2 rounded-lg transition-all duration-150 font-semibold"
          style={{ background: "rgba(255, 178, 36,0.04)" }}
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
    color: "#6b6455",
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
        style={{ background: "#12100b", color: config.color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#e8e3d8] leading-snug">
          <span className="font-bold">{entry.username ?? "System"}</span>{" "}
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
      {!compact && (
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "#12100b", color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
