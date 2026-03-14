import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Clock, Users, Activity, Zap } from "lucide-react";
import { metricsApi } from "../api/metrics";

type Period = "24h" | "7d" | "30d";

const PERIOD_LABELS: Record<Period, string> = { "24h": "24 Hours", "7d": "7 Days", "30d": "30 Days" };

function formatTime(ts: string, period: Period) {
  const d = new Date(ts);
  if (period === "24h") return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  if (period === "7d") return d.toLocaleDateString("en-US", { weekday: "short", hour: "2-digit", hour12: false });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="text-[#94a3b8] mb-1">{new Date(d?.timestamp || label).toLocaleString()}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function ServerMetrics({ serverId }: { serverId: number }) {
  const [period, setPeriod] = useState<Period>("24h");

  const { data: metrics = [] } = useQuery({
    queryKey: ["server-metrics", serverId, period],
    queryFn: () => metricsApi.getServerMetrics(serverId, period),
    refetchInterval: 60000,
  });

  const { data: summary } = useQuery({
    queryKey: ["server-metrics-summary", serverId],
    queryFn: () => metricsApi.getMetricsSummary(serverId),
    refetchInterval: 60000,
  });

  const { data: heuristics } = useQuery({
    queryKey: ["server-heuristics", serverId],
    queryFn: () => metricsApi.getHeuristics(serverId),
    refetchInterval: 120000,
  });

  const periodKey = period === "24h" ? "24h" : period === "7d" ? "7d" : "30d";
  const uptime = summary ? summary[`uptime_${periodKey}`] : 0;
  const peak = summary ? summary[`peak_players_${periodKey}`] : 0;
  const avg = summary ? summary[`avg_players_${periodKey}`] : 0;

  const TrendIcon = heuristics?.trend === "growing" ? TrendingUp : heuristics?.trend === "declining" ? TrendingDown : Minus;
  const trendColor = heuristics?.trend === "growing" ? "#00d4aa" : heuristics?.trend === "declining" ? "#ff4757" : "#64748b";

  const chartData = metrics.map((m) => ({
    ...m,
    time: formatTime(m.timestamp, period),
  }));

  // Uptime blocks data (last N entries, colored)
  const uptimeBlocks = metrics.map((m) => ({
    time: formatTime(m.timestamp, period),
    value: 1,
    online: m.is_online,
    timestamp: m.timestamp,
  }));

  // Response time data (filter nulls)
  const rtData = metrics
    .filter((m) => m.response_time_ms != null)
    .map((m) => ({
      time: formatTime(m.timestamp, period),
      response_time_ms: m.response_time_ms,
      timestamp: m.timestamp,
    }));

  const statCards = [
    { label: "Uptime", value: `${(uptime * 100).toFixed(1)}%`, icon: Activity, accent: uptime >= 0.9 ? "#00d4aa" : uptime >= 0.7 ? "#fbbf24" : "#ff4757" },
    { label: "Peak Players", value: peak, icon: Users, accent: "#818cf8" },
    { label: "Avg Players", value: avg, icon: Users, accent: "#00bfa5" },
    { label: "Streak", value: `${summary?.current_streak_hours ?? 0}h`, icon: Clock, accent: "#fbbf24" },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        {(["24h", "7d", "30d"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === p ? "text-[#0a0e1a]" : "text-[#64748b] hover:text-white"
            }`}
            style={{
              background: period === p ? "#00d4aa" : "rgba(255,255,255,0.04)",
              border: `1px solid ${period === p ? "#00d4aa" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5" style={{ color: card.accent }} />
                <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-2xl font-black text-white tabular-nums">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Heuristics Row */}
      {heuristics && (
        <div className="rounded-xl p-4 flex flex-wrap items-center gap-6" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <TrendIcon className="h-4 w-4" style={{ color: trendColor }} />
            <span className="text-sm text-[#e2e8f0] font-semibold capitalize">{heuristics.trend}</span>
            <span className="text-xs font-mono" style={{ color: trendColor }}>
              {heuristics.trend_percent > 0 ? "+" : ""}{heuristics.trend_percent}%
            </span>
          </div>
          <div className="text-xs text-[#64748b]">
            <span className="text-[#94a3b8] font-medium">Peak hours:</span>{" "}
            {heuristics.peak_hours.length > 0
              ? heuristics.peak_hours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")
              : "N/A"}
          </div>
          <div className="text-xs text-[#64748b]">
            <span className="text-[#94a3b8] font-medium">Median players:</span>{" "}
            <span className="text-white font-semibold">{heuristics.median_players}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3" style={{ color: heuristics.is_healthy ? "#00d4aa" : "#ff4757" }} />
            <span className="text-xs font-semibold" style={{ color: heuristics.is_healthy ? "#00d4aa" : "#ff4757" }}>
              {heuristics.is_healthy ? "Healthy" : "Needs attention"}
            </span>
          </div>
        </div>
      )}

      {/* Player Count Chart */}
      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h4 className="text-sm font-bold text-[#e2e8f0] mb-4">Player Count</h4>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="player_count" stroke="#00bfa5" strokeWidth={2} dot={false} name="Players" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-[#64748b] py-12 text-sm">No metrics data available yet</p>
        )}
      </div>

      {/* Uptime Bar */}
      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h4 className="text-sm font-bold text-[#e2e8f0] mb-4">Uptime</h4>
        {uptimeBlocks.length > 0 ? (
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={uptimeBlocks} barCategoryGap={0} barGap={0}>
              <XAxis dataKey="time" hide />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-[#94a3b8]">{new Date(d.timestamp).toLocaleString()}</p>
                    <p style={{ color: d.online ? "#10b981" : "#ff4757" }} className="font-semibold">
                      {d.online ? "Online" : "Offline"}
                    </p>
                  </div>
                );
              }} />
              <Bar dataKey="value" radius={[2, 2, 2, 2]}>
                {uptimeBlocks.map((entry, i) => (
                  <Cell key={i} fill={entry.online ? "#10b981" : "#ff4757"} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-[#64748b] py-4 text-sm">No data</p>
        )}
      </div>

      {/* Response Time Chart */}
      {rtData.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h4 className="text-sm font-bold text-[#e2e8f0] mb-4">Response Time (ms)</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rtData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="response_time_ms" stroke="#818cf8" strokeWidth={2} dot={false} name="Response Time" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
