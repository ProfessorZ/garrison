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

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none transition-all duration-150";
  const inputStyle: React.CSSProperties = { background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="mt-6 rounded-xl p-6" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
      <h3 className="text-sm font-bold text-[#e8e3d8] uppercase tracking-wider mb-4 flex items-center gap-2">
        <Map className="h-4 w-4 text-[#6b6455]" />
        Map Management
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffb224] border-r-transparent" />
          <span className="text-sm text-[#6b6455]">Loading maps...</span>
        </div>
      ) : unsupported ? (
        <p className="text-sm text-[#6b6455]">Map change not supported for this server type</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-[#8a8271] mb-1.5 uppercase tracking-wider">
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
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-[#0b0a08] disabled:opacity-50 transition-all duration-150 shrink-0"
            style={{ background: "#ffb224" }}
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
            style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-[#6b6455] hover:text-[#e8e3d8] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full p-2.5" style={{ background: "rgba(255,165,2,0.1)" }}>
                <AlertTriangle className="h-5 w-5" style={{ color: "#e3b454" }} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-base font-bold text-[#e8e3d8]">Change Map?</h3>
                <p className="text-sm text-[#8a8271] mt-1.5 leading-relaxed">
                  This will change the map to <strong className="text-[#e8e3d8]">{mapToApply}</strong> and may disconnect all players.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={changeMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#e8e3d8] disabled:opacity-50 transition-all duration-150"
                style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => changeMutation.mutate(mapToApply)}
                disabled={changeMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm font-bold text-[#0b0a08] disabled:opacity-50 transition-all duration-150"
                style={{ background: "#e3b454" }}
              >
                {changeMutation.isPending ? "..." : "Change Map"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in rounded-lg px-4 py-3 text-sm font-medium text-[#e8e3d8] shadow-xl"
          style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
