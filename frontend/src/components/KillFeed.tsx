import { useQuery } from "@tanstack/react-query";
import { Crosshair, Skull, AlertTriangle } from "lucide-react";
import { eventsApi } from "../api/events";
import type { GameEvent } from "../types";

interface KillFeedProps {
  serverId: number;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function KillFeed({ serverId }: KillFeedProps) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["server-kills", serverId],
    queryFn: () => eventsApi.getEvents(serverId, "kill", 100),
    refetchInterval: 15000,
  });

  const { data: teamkills = [] } = useQuery({
    queryKey: ["server-teamkills", serverId],
    queryFn: () => eventsApi.getEvents(serverId, "teamkill", 50),
    refetchInterval: 15000,
  });

  // Merge and sort by timestamp desc
  const allKills = [...events, ...teamkills].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  if (allKills.length === 0) {
    return (
      <div
        className="rounded-xl flex items-center justify-center h-64"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="text-center">
          <Crosshair className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
          <p className="text-sm text-[#94a3b8]">No kill events recorded</p>
          <p className="text-xs text-[#64748b] mt-1">
            Kill events will appear here as they happen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        height: "32rem",
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Crosshair className="h-4 w-4 text-[#64748b]" />
        <span className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider">
          Kill Feed
        </span>
        <span className="text-xs text-[#64748b]">
          &middot; {allKills.length} events
        </span>
      </div>

      {/* Kill list */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <th className="text-left px-4 py-2.5">Time</th>
              <th className="text-left px-4 py-2.5">Killer</th>
              <th className="text-left px-4 py-2.5"></th>
              <th className="text-left px-4 py-2.5">Victim</th>
              <th className="text-left px-4 py-2.5">Weapon</th>
            </tr>
          </thead>
          <tbody>
            {allKills.map((ev) => {
              const isTK = ev.event_type === "teamkill";
              return (
                <tr
                  key={ev.id}
                  className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <td className="px-4 py-2 text-[11px] text-[#64748b] font-mono whitespace-nowrap">
                    {formatTime(ev.timestamp)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: isTK ? "#ff4757" : "#e2e8f0" }}
                    >
                      {ev.player_name ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-1">
                    {isTK ? (
                      <AlertTriangle
                        className="h-3.5 w-3.5"
                        style={{ color: "#ff4757" }}
                      />
                    ) : (
                      <Skull
                        className="h-3.5 w-3.5"
                        style={{ color: "#64748b" }}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-[13px] text-[#94a3b8]">
                      {ev.target_name ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        color: "#94a3b8",
                      }}
                    >
                      {ev.weapon ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
