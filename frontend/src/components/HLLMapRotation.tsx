import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Map, Trash2, Play, Plus, Search, X } from "lucide-react";
import { hllApi, type HLLMap } from "../api/hll";

interface Props {
  serverId: number;
}

function prettifyMapName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bGer\b/i, "Germany")
    .replace(/\bUs\b/i, "US")
    .replace(/\bRus\b/i, "Russia");
}

function gameModeBadge(name: string): { label: string; color: string } | null {
  const lower = name.toLowerCase();
  if (lower.includes("offensive")) return { label: "Offensive", color: "#fb923c" };
  if (lower.includes("warfare")) return { label: "Warfare", color: "#38bdf8" };
  if (lower.includes("skirmish")) return { label: "Skirmish", color: "#a78bfa" };
  return null;
}

export default function HLLMapRotation({ serverId }: Props) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [changingMap, setChangingMap] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: rotation, isLoading } = useQuery({
    queryKey: ["hll-map-rotation", serverId],
    queryFn: () => hllApi.getMapRotation(serverId),
    refetchInterval: 30000,
  });

  const { data: availableMapsData } = useQuery({
    queryKey: ["hll-available-maps", serverId],
    queryFn: () => hllApi.getAvailableMaps(serverId),
    staleTime: 300000,
    enabled: showAdd,
  });

  const { data: sequence } = useQuery({
    queryKey: ["hll-map-sequence", serverId],
    queryFn: () => hllApi.getMapSequence(serverId),
    refetchInterval: 30000,
  });

  const addMap = useMutation({
    mutationFn: ({ map_name, game_mode }: { map_name: string; game_mode?: string }) =>
      hllApi.addMapToRotation(serverId, map_name, game_mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hll-map-rotation", serverId] });
      setShowAdd(false);
      setMapSearch("");
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeMap = useMutation({
    mutationFn: (map_name: string) => hllApi.removeMapFromRotation(serverId, map_name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hll-map-rotation", serverId] });
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const changeMap = useMutation({
    mutationFn: (map_name: string) => hllApi.changeMap(serverId, map_name),
    onSuccess: () => {
      setChangingMap(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const maps: HLLMap[] = rotation?.maps ?? (Array.isArray(rotation) ? rotation : []);
  const availableMaps: HLLMap[] = availableMapsData?.maps ?? [];
  const filteredAvailable = availableMaps.filter(
    (m) => m.name.toLowerCase().includes(mapSearch.toLowerCase()) ||
           prettifyMapName(m.name).toLowerCase().includes(mapSearch.toLowerCase())
  );

  const currentMap = sequence?.current_map ?? sequence?.currentMap;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-[#ff4757]" style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.15)" }}>
          {error}
        </div>
      )}

      {/* Current Map */}
      {currentMap && (
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(0,212,170,0.15)" }}>
          <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Current Map</div>
          <div className="flex items-center gap-3">
            <Map className="h-5 w-5 text-[#00d4aa]" />
            <span className="text-lg font-bold text-[#e2e8f0]">{prettifyMapName(typeof currentMap === "string" ? currentMap : currentMap.name)}</span>
            {typeof currentMap === "object" && currentMap.gameMode && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
                {currentMap.gameMode}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Rotation List */}
      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">Map Rotation</h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
            style={{ background: showAdd ? "rgba(255,71,87,0.1)" : "rgba(0,212,170,0.1)", color: showAdd ? "#ff4757" : "#00d4aa" }}
          >
            {showAdd ? <><X className="h-3 w-3" /> Cancel</> : <><Plus className="h-3 w-3" /> Add Map</>}
          </button>
        </div>

        {maps.length === 0 ? (
          <div className="text-sm text-[#64748b] text-center py-8">No maps in rotation</div>
        ) : (
          <div className="space-y-1">
            {maps.map((m, i) => {
              const name = typeof m === "string" ? m : m.name;
              const badge = gameModeBadge(name);
              const isActive = currentMap && (typeof currentMap === "string" ? currentMap === name : currentMap.name === name);
              return (
                <div
                  key={`${name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 group transition-colors"
                  style={{
                    background: isActive ? "rgba(0,212,170,0.06)" : "transparent",
                    border: isActive ? "1px solid rgba(0,212,170,0.12)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] text-[#64748b] font-mono w-5 text-right shrink-0">{i + 1}</span>
                    <span className="text-sm text-[#e2e8f0] truncate">{prettifyMapName(name)}</span>
                    {badge && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                        style={{ background: `${badge.color}15`, color: badge.color }}>
                        {badge.label}
                      </span>
                    )}
                    {isActive && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                        style={{ background: "rgba(0,212,170,0.1)", color: "#00d4aa" }}>
                        PLAYING
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {changingMap === name ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[#ffa502]">Change now?</span>
                        <button onClick={() => changeMap.mutate(name)}
                          className="px-2 py-1 rounded text-[#00d4aa] hover:bg-[rgba(0,212,170,0.1)] font-bold">Yes</button>
                        <button onClick={() => setChangingMap(null)}
                          className="px-2 py-1 rounded text-[#64748b] hover:bg-[rgba(255,255,255,0.05)] font-bold">No</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setChangingMap(name)} title="Change to this map now"
                          className="p-1.5 rounded-md text-[#64748b] hover:text-[#00d4aa] hover:bg-[rgba(0,212,170,0.08)] transition-colors">
                          <Play className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeMap.mutate(name)} title="Remove from rotation"
                          className="p-1.5 rounded-md text-[#64748b] hover:text-[#ff4757] hover:bg-[rgba(255,71,87,0.08)] transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Map Dropdown */}
      {showAdd && (
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(0,212,170,0.15)" }}>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748b]" />
            <input
              type="text"
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              placeholder="Search maps..."
              className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {filteredAvailable.length === 0 ? (
              <div className="text-sm text-[#64748b] text-center py-4">
                {availableMaps.length === 0 ? "Loading maps..." : "No maps match search"}
              </div>
            ) : (
              filteredAvailable.map((m) => {
                const badge = gameModeBadge(m.name);
                return (
                  <button
                    key={m.name}
                    onClick={() => addMap.mutate({ map_name: m.name, game_mode: m.gameMode })}
                    disabled={addMap.isPending}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#e2e8f0] hover:bg-[rgba(0,212,170,0.06)] transition-colors"
                  >
                    <Map className="h-3.5 w-3.5 text-[#64748b] shrink-0" />
                    <span className="truncate">{prettifyMapName(m.name)}</span>
                    {badge && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                        style={{ background: `${badge.color}15`, color: badge.color }}>
                        {badge.label}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
