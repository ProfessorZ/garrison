import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Map, AlertTriangle, X } from "lucide-react";
import { serversApi } from "../api/servers";
import axios from "axios";

interface MapChangePanelProps {
  serverId: number;
  gameType: string;
}

export default function MapChangePanel({ serverId, gameType }: MapChangePanelProps) {
  const [selectedMap, setSelectedMap] = useState("");
  const [customMap, setCustomMap] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: maps, isLoading, isError } = useQuery({
    queryKey: ["server-maps", serverId],
    queryFn: () => serversApi.getMaps(serverId),
  });

  const changeMutation = useMutation({
    mutationFn: (mapName: string) => serversApi.changeMap(serverId, mapName),
    onSuccess: () => {
      setShowConfirm(false);
      showToast("Map change initiated");
    },
    onError: (err) => {
      setShowConfirm(false);
      if (axios.isAxiosError(err) && err.response?.status === 501) {
        showToast("Not supported by this server type");
      } else {
        showToast("Failed to change map");
      }
    },
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const hasMaps = maps && maps.length > 0;
  const useTextInput = !hasMaps && gameType === "factorio";
  const unsupported = isError || (!hasMaps && !useTextInput);
  const mapToApply = hasMaps ? selectedMap : customMap.trim();

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle: React.CSSProperties = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="mt-6 rounded-xl p-6" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
      <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider mb-4 flex items-center gap-2">
        <Map className="h-4 w-4 text-[#64748b]" />
        Map Management
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00d4aa] border-r-transparent" />
          <span className="text-sm text-[#64748b]">Loading maps...</span>
        </div>
      ) : unsupported ? (
        <p className="text-sm text-[#64748b]">Map change not supported for this server type</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
              {hasMaps ? "Select Map" : "Map Name"}
            </label>
            {hasMaps ? (
              <select
                value={selectedMap}
                onChange={(e) => setSelectedMap(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Choose a map...</option>
                {maps!.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Enter map name..."
                value={customMap}
                onChange={(e) => setCustomMap(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            )}
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!mapToApply || changeMutation.isPending}
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150 shrink-0"
            style={{ background: "#00d4aa" }}
          >
            Change Map
          </button>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div
            className="relative shadow-2xl w-full p-6 animate-fade-in max-w-md mx-0 sm:mx-4 rounded-none sm:rounded-xl h-full sm:h-auto flex flex-col justify-center"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-[#64748b] hover:text-[#e2e8f0] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full p-2.5" style={{ background: "rgba(255,165,2,0.1)" }}>
                <AlertTriangle className="h-5 w-5" style={{ color: "#ffa502" }} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-base font-bold text-[#e2e8f0]">Change Map?</h3>
                <p className="text-sm text-[#94a3b8] mt-1.5 leading-relaxed">
                  This will change the map to <strong className="text-[#e2e8f0]">{mapToApply}</strong> and may disconnect all players.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={changeMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#e2e8f0] disabled:opacity-50 transition-all duration-150"
                style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => changeMutation.mutate(mapToApply)}
                disabled={changeMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
                style={{ background: "#ffa502" }}
              >
                {changeMutation.isPending ? "..." : "Change Map"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in rounded-lg px-4 py-3 text-sm font-medium text-[#e2e8f0] shadow-xl"
          style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
