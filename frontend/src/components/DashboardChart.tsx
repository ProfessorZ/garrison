import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "../api/metrics";

export default function DashboardChart() {
  const { data: dashMetrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: metricsApi.getDashboardMetrics,
    refetchInterval: 60000,
  });

  return (
    <div className="rounded-2xl p-5" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#e8e3d8]">Overview (24h)</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[10px] font-semibold text-[#6b6455] uppercase tracking-wider mb-1">Player-Hours</p>
          <p className="text-2xl font-black text-white tabular-nums">
            {dashMetrics?.total_player_hours_24h?.toFixed(1) ?? "0.0"}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[10px] font-semibold text-[#6b6455] uppercase tracking-wider mb-1">Uptime</p>
          <p className="text-2xl font-black tabular-nums" style={{
            color: (dashMetrics?.combined_uptime_percent ?? 0) >= 0.9 ? "#ffb224" : (dashMetrics?.combined_uptime_percent ?? 0) >= 0.7 ? "#e3b454" : "#d96b5c",
          }}>
            {((dashMetrics?.combined_uptime_percent ?? 0) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
