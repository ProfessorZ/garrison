import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/analytics";

const PERIODS = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
] as const;

function Bar({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 2 }}>
        <span style={{ color: "#e2e8f0" }}>{label}</span>
        <span style={{ color: "#94a3b8" }}>{sub}</span>
      </div>
      <div style={{ background: "#1a1f2e", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#00d4aa", borderRadius: 4, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: 16 }}>{text}</p>;
}

export default function ServerAnalytics({ serverId }: { serverId: number }) {
  const [period, setPeriod] = useState("7d");

  const { data: kills, isLoading: killsLoading } = useQuery({
    queryKey: ["analytics-kills", serverId, period],
    queryFn: () => analyticsApi.getKillStats(serverId, period),
  });

  const { data: maps, isLoading: mapsLoading } = useQuery({
    queryKey: ["analytics-maps", serverId, period],
    queryFn: () => analyticsApi.getMapStats(serverId, period),
  });

  const loading = killsLoading || mapsLoading;

  const killerMax = kills?.top_killers[0]?.kills ?? 0;
  const weaponMax = kills?.top_weapons[0]?.kills ?? 0;
  const victimMax = kills?.most_killed[0]?.deaths ?? 0;
  const tkMax = kills?.teamkillers[0]?.teamkills ?? 0;
  const mapMax = maps?.maps_played[0]?.times_played ?? 0;

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid " + (period === p.key ? "#00d4aa" : "rgba(255,255,255,0.06)"),
              background: period === p.key ? "rgba(0,212,170,0.08)" : "#111827",
              color: period === p.key ? "#00d4aa" : "#94a3b8",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
          {/* Kill Statistics */}
          <Card title="Kill Statistics">
            <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
              <div>
                <div style={{ color: "#00d4aa", fontSize: 28, fontWeight: 800 }}>{kills?.total_kills ?? 0}</div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>Total Kills</div>
              </div>
              <div>
                <div style={{ color: "#ff4757", fontSize: 28, fontWeight: 800 }}>{kills?.total_teamkills ?? 0}</div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>Team Kills</div>
              </div>
            </div>

            <h4 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Top Killers</h4>
            {kills?.top_killers.length ? (
              kills.top_killers.map((k) => <Bar key={k.name} value={k.kills} max={killerMax} label={k.name} sub={`${k.kills} kills`} />)
            ) : (
              <EmptyState text="No kill data" />
            )}
          </Card>

          {/* Top Weapons */}
          <Card title="Top Weapons">
            {kills?.top_weapons.length ? (
              kills.top_weapons.map((w) => <Bar key={w.weapon} value={w.kills} max={weaponMax} label={w.weapon} sub={`${w.kills} kills`} />)
            ) : (
              <EmptyState text="No weapon data" />
            )}
          </Card>

          {/* Most Killed */}
          <Card title="Most Killed">
            {kills?.most_killed.length ? (
              kills.most_killed.map((v) => <Bar key={v.name} value={v.deaths} max={victimMax} label={v.name} sub={`${v.deaths} deaths`} />)
            ) : (
              <EmptyState text="No death data" />
            )}
          </Card>

          {/* Teamkillers */}
          <Card title="Teamkillers">
            {kills?.teamkillers.length ? (
              kills.teamkillers.map((t) => (
                <Bar key={t.name} value={t.teamkills} max={tkMax} label={t.name} sub={`${t.teamkills} TKs`} />
              ))
            ) : (
              <EmptyState text="No teamkill data" />
            )}
          </Card>

          {/* Maps Played */}
          <Card title="Maps Played">
            {maps?.maps_played.length ? (
              maps.maps_played.map((m) => (
                <Bar key={m.map} value={m.times_played} max={mapMax} label={m.map} sub={`${m.times_played}x`} />
              ))
            ) : (
              <EmptyState text="No map data" />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
