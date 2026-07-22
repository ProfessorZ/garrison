import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Map, Search, Play, Trash2, ChevronUp, ChevronDown, Plus, Save, Loader2 } from "lucide-react";
import { hllApi } from "../api/hll";
import { serversApi } from "../api/servers";

interface Props {
  serverId: number;
}

interface RotationMap {
  name: string;
  gameMode: string;
  timeOfDay: string;
  iD: string;
  position: number;
}

interface RotationResponse {
  currentIndex: number;
  mAPS: RotationMap[];
}

type GameModeFilter = "All" | "Warfare" | "Offensive" | "Skirmish";

const MODE_COLORS: Record<string, string> = {
  Warfare: "#38bdf8",
  Offensive: "#fb923c",
  Skirmish: "#a78bfa",
};

function modeBadge(mode: string) {
  const color = MODE_COLORS[mode] ?? "#8a8271";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
      style={{ background: `${color}15`, color }}
    >
      {mode}
    </span>
  );
}

function todIcon(timeOfDay: string) {
  const t = timeOfDay.toLowerCase();
  if (t === "night") return "🌙";
  if (t === "dawn" || t === "dusk") return "🌅";
  return "☀️";
}

function prettifyMapName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bGer\b/i, "Germany")
    .replace(/\bUs\b/i, "US")
    .replace(/\bRus\b/i, "Russia");
}

/** Deduplicate rotation maps by iD to build the "all maps" library */
function buildLibrary(maps: RotationMap[]): RotationMap[] {
  const seen = new Set<string>();
  const result: RotationMap[] = [];
  for (const m of maps) {
    if (!seen.has(m.iD)) {
      seen.add(m.iD);
      result.push(m);
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name) || a.gameMode.localeCompare(b.gameMode));
}

/** Group maps by map name */
function groupByName(maps: RotationMap[]): Record<string, RotationMap[]> {
  const groups: Record<string, RotationMap[]> = {};
  for (const m of maps) {
    (groups[m.name] ??= []).push(m);
  }
  return groups;
}

export default function HLLMapRotation({ serverId }: Props) {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<GameModeFilter>("All");

  // Local rotation state (edited, not yet saved)
  const [localRotation, setLocalRotation] = useState<RotationMap[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Save progress
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");
  const [error, setError] = useState("");
  const [changingMap, setChangingMap] = useState<string | null>(null);

  const { data, isLoading } = useQuery<RotationResponse>({
    queryKey: ["hll-map-rotation", serverId],
    queryFn: () => hllApi.getMapRotation(serverId),
    refetchInterval: 30000,
  });

  const { data: availableData } = useQuery({
    queryKey: ["hll-available-maps", serverId],
    queryFn: () => hllApi.getAvailableMaps(serverId),
    staleTime: 300_000,
  });

  // Fetch live status to get the actual current map (currentIndex in rotation is unreliable)
  const { data: statusData } = useQuery({
    queryKey: ["server-status-live", serverId],
    queryFn: () => serversApi.getStatus(serverId, true),
    refetchInterval: 30000,
  });
  const activeMapId: string | null = (statusData as any)?.extra?.map ?? null;

  // Initialize local rotation from server data
  const serverMaps = data?.mAPS ?? [];
  const rotation = localRotation ?? serverMaps;
  const isDirty = localRotation !== null;

  // When server data arrives and we have no local edits, track the index
  if (data && localRotation === null && data.currentIndex !== currentIndex) {
    setCurrentIndex(data.currentIndex);
  }

  // Prefer full available-maps catalog; fall back to rotation-derived library
  const availableMaps = (availableData?.maps ?? []) as RotationMap[];
  const library =
    availableMaps.length > 0
      ? [...availableMaps].sort(
          (a, b) => a.name.localeCompare(b.name) || a.gameMode.localeCompare(b.gameMode)
        )
      : buildLibrary(serverMaps);

  // Apply filters to library
  const filteredLibrary = library.filter((m) => {
    if (modeFilter !== "All" && m.gameMode !== modeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        prettifyMapName(m.name).toLowerCase().includes(q) ||
        m.gameMode.toLowerCase().includes(q) ||
        m.iD.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const groupedLibrary = groupByName(filteredLibrary);

  // Edit handlers
  const editRotation = useCallback((updater: (prev: RotationMap[]) => RotationMap[]) => {
    setLocalRotation((prev) => updater(prev ?? serverMaps));
  }, [serverMaps]);

  const addToRotation = useCallback((m: RotationMap) => {
    editRotation((prev) => [...prev, { ...m, position: prev.length }]);
  }, [editRotation]);

  const removeFromRotation = useCallback((index: number) => {
    editRotation((prev) => prev.filter((_, i) => i !== index));
  }, [editRotation]);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    editRotation((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, [editRotation]);

  const moveDown = useCallback((index: number) => {
    editRotation((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, [editRotation]);

  const handleSave = async () => {
    if (!localRotation) return;
    setSaving(true);
    setError("");
    try {
      const serverIds = new Set(serverMaps.map(m => m.iD));
      const localIds = new Set(localRotation.map(m => m.iD));

      // Maps to remove (in server but not in new rotation)
      const toRemove = serverMaps.filter(m => !localIds.has(m.iD));
      // Maps to add (in new rotation but not in server)
      const toAdd = localRotation.filter(m => !serverIds.has(m.iD));

      if (toRemove.length === 0 && toAdd.length === 0) {
        // Only reorder — HLL doesn't support reorder natively, must remove+re-add changed maps
        // Do a full replace only if order actually changed
        const orderChanged = localRotation.some((m, i) => serverMaps[i]?.iD !== m.iD);
        if (!orderChanged) {
          setLocalRotation(null);
          return;
        }
        // For reorder: remove all and re-add in new order (unavoidable for HLL)
        setSaveProgress("Reordering rotation...");
        await Promise.all(serverMaps.map(m => hllApi.removeMapFromRotation(serverId, m.iD)));
        for (const m of localRotation) {
          await hllApi.addMapToRotation(serverId, m.iD, m.gameMode);
        }
      } else {
        // Diff-based: only remove maps that are gone, add new ones — much faster
        setSaveProgress(`Applying changes (−${toRemove.length} +${toAdd.length})...`);
        await Promise.all(toRemove.map(m => hllApi.removeMapFromRotation(serverId, m.iD)));
        await Promise.all(toAdd.map(m => hllApi.addMapToRotation(serverId, m.iD, m.gameMode)));
      }

      setSaveProgress("");
      setLocalRotation(null);
      queryClient.invalidateQueries({ queryKey: ["hll-map-rotation", serverId] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
      setSaveProgress("");
    }
  };

  const handleChangeMap = async (mapId: string) => {
    setError("");
    try {
      await hllApi.changeMap(serverId, mapId);
      setChangingMap(null);
      queryClient.invalidateQueries({ queryKey: ["hll-map-rotation", serverId] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to change map");
    }
  };

  const discardChanges = () => {
    setLocalRotation(null);
  };

  // Current playing map
  // Find currently active map by mapId from live status, fall back to currentIndex
  const nowPlaying = activeMapId
    ? serverMaps.find(m => m.iD === activeMapId) ?? serverMaps[data?.currentIndex ?? 0]
    : serverMaps[data?.currentIndex ?? 0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#e8e3d8] flex items-center gap-2">
          <Map className="h-5 w-5 text-[#ffb224]" />
          Map Rotation
        </h2>
        {nowPlaying && (
          <div className="text-sm text-[#8a8271]">
            Now playing:{" "}
            <span className="text-[#e8e3d8] font-semibold">
              {prettifyMapName(nowPlaying.name)} — {nowPlaying.gameMode} — {nowPlaying.timeOfDay}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm text-[#d96b5c]"
          style={{ background: "rgba(217, 107, 92,0.08)", border: "1px solid rgba(217, 107, 92,0.15)" }}
        >
          {error}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left panel — All Maps library */}
        <div
          className="rounded-xl p-4 flex flex-col"
          style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="text-sm font-bold text-[#e8e3d8] uppercase tracking-wider mb-3">
            All Maps
          </h3>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b6455]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search maps..."
              className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none"
              style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </div>

          {/* Mode filter buttons */}
          <div className="flex gap-1.5 mb-3">
            {(["All", "Warfare", "Offensive", "Skirmish"] as GameModeFilter[]).map((mode) => {
              const active = modeFilter === mode;
              const color = mode === "All" ? "#8a8271" : MODE_COLORS[mode];
              return (
                <button
                  key={mode}
                  onClick={() => setModeFilter(mode)}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
                  style={{
                    background: active ? `${color}20` : "transparent",
                    color: active ? color : "#6b6455",
                    border: active ? `1px solid ${color}30` : "1px solid transparent",
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* Map list grouped by name */}
          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3">
            {Object.keys(groupedLibrary).length === 0 ? (
              <div className="text-sm text-[#6b6455] text-center py-8">No maps match filter</div>
            ) : (
              Object.entries(groupedLibrary).map(([mapName, maps]) => (
                <div key={mapName}>
                  <div className="text-[11px] font-semibold text-[#6b6455] uppercase tracking-wider mb-1 px-1">
                    {prettifyMapName(mapName)}
                  </div>
                  <div className="space-y-0.5">
                    {maps.map((m) => (
                      <button
                        key={m.iD}
                        onClick={() => addToRotation(m)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#e8e3d8] hover:bg-[rgba(255, 178, 36,0.06)] transition-colors group"
                      >
                        <Plus className="h-3 w-3 text-[#6b6455] group-hover:text-[#ffb224] transition-colors shrink-0" />
                        <span className="truncate">{prettifyMapName(m.name)}</span>
                        {modeBadge(m.gameMode)}
                        <span className="text-xs shrink-0" title={m.timeOfDay}>
                          {todIcon(m.timeOfDay)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel — Current Rotation */}
        <div
          className="rounded-xl p-4 flex flex-col"
          style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#e8e3d8] uppercase tracking-wider">
              Current Rotation
              <span className="text-[#6b6455] font-normal ml-2">({rotation.length} maps)</span>
            </h3>
            {isDirty && (
              <button
                onClick={discardChanges}
                className="text-xs text-[#6b6455] hover:text-[#d96b5c] transition-colors"
              >
                Discard changes
              </button>
            )}
          </div>

          {rotation.length === 0 ? (
            <div className="text-sm text-[#6b6455] text-center py-8 flex-1">
              No maps in rotation. Add maps from the library.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[500px] space-y-0.5">
              {rotation.map((m, i) => {
                const isActive = !isDirty && (activeMapId ? m.iD === activeMapId : i === (data?.currentIndex ?? -1));
                return (
                  <div
                    key={`${m.iD}-${i}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 group transition-colors"
                    style={{
                      background: isActive ? "rgba(255, 178, 36,0.06)" : "transparent",
                      border: isActive ? "1px solid rgba(255, 178, 36,0.12)" : "1px solid transparent",
                    }}
                  >
                    {/* Number */}
                    <span className="text-[11px] text-[#6b6455] font-mono w-5 text-right shrink-0">
                      {i + 1}
                    </span>

                    {/* Map info */}
                    <span className="text-sm text-[#e8e3d8] truncate">{prettifyMapName(m.name)}</span>
                    {modeBadge(m.gameMode)}
                    <span className="text-xs shrink-0" title={m.timeOfDay}>
                      {todIcon(m.timeOfDay)}
                    </span>

                    {isActive && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                        style={{ background: "rgba(255, 178, 36,0.1)", color: "#ffb224" }}
                      >
                        PLAYING
                      </span>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {/* Reorder arrows */}
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="p-1 rounded text-[#6b6455] hover:text-[#e8e3d8] disabled:opacity-20 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === rotation.length - 1}
                        className="p-1 rounded text-[#6b6455] hover:text-[#e8e3d8] disabled:opacity-20 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Change map */}
                      {changingMap === `${m.iD}-${i}` ? (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-[#e3b454]">Switch?</span>
                          <button
                            onClick={() => handleChangeMap(m.iD)}
                            className="px-1.5 py-0.5 rounded text-[#ffb224] hover:bg-[rgba(255, 178, 36,0.1)] font-bold"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setChangingMap(null)}
                            className="px-1.5 py-0.5 rounded text-[#6b6455] hover:bg-[rgba(255,255,255,0.05)] font-bold"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setChangingMap(`${m.iD}-${i}`)}
                          className="p-1 rounded text-[#6b6455] hover:text-[#ffb224] hover:bg-[rgba(255, 178, 36,0.08)] transition-colors"
                          title="Change to this map"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => removeFromRotation(i)}
                        className="p-1 rounded text-[#6b6455] hover:text-[#d96b5c] hover:bg-[rgba(217, 107, 92,0.08)] transition-colors"
                        title="Remove from rotation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save button */}
          {isDirty && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {saving ? (
                <div className="flex items-center gap-2 text-sm text-[#8a8271]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#ffb224]" />
                  {saveProgress}
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all"
                  style={{ background: "rgba(255, 178, 36,0.15)", color: "#ffb224", border: "1px solid rgba(255, 178, 36,0.25)" }}
                >
                  <Save className="h-4 w-4" />
                  Save Rotation
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
