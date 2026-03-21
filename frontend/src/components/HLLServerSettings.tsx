import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Star, Plus, Trash2, X } from "lucide-react";
import { hllApi, type HLLSettings, type HLLVip } from "../api/hll";

interface Props {
  serverId: number;
}

interface SettingField {
  key: keyof HLLSettings;
  label: string;
  type: "toggle" | "number";
  suffix?: string;
  description?: string;
}

const SETTING_FIELDS: SettingField[] = [
  { key: "autobalance_enabled", label: "Autobalance", type: "toggle", description: "Automatically balance teams" },
  { key: "autobalance_threshold", label: "Autobalance Threshold", type: "number", description: "Max player difference before autobalance" },
  { key: "team_switch_cooldown", label: "Team Switch Cooldown", type: "number", suffix: "min" },
  { key: "idle_kick_minutes", label: "Idle Kick Duration", type: "number", suffix: "min" },
  { key: "max_ping", label: "Max Ping Threshold", type: "number", suffix: "ms" },
  { key: "vote_kick_enabled", label: "Vote Kick", type: "toggle" },
  { key: "max_queue_length", label: "Max Queue Length", type: "number" },
  { key: "vip_slots", label: "VIP Slot Count", type: "number" },
  { key: "map_shuffle", label: "Map Shuffle", type: "toggle", description: "Randomize map rotation order" },
];

export default function HLLServerSettings({ serverId }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // VIP state
  const [showAddVip, setShowAddVip] = useState(false);
  const [vipId, setVipId] = useState("");
  const [vipComment, setVipComment] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["hll-settings", serverId],
    queryFn: () => hllApi.getSettings(serverId),
  });

  const { data: vipsData, isLoading: vipsLoading } = useQuery({
    queryKey: ["hll-vips", serverId],
    queryFn: () => hllApi.getVips(serverId),
  });

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data: Partial<HLLSettings>) => hllApi.updateSettings(serverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hll-settings", serverId] });
      setSaved(true);
      setError("");
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const addVip = useMutation({
    mutationFn: () => hllApi.addVip(serverId, vipId, vipComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hll-vips", serverId] });
      setVipId("");
      setVipComment("");
      setShowAddVip(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeVip = useMutation({
    mutationFn: (player_id: string) => hllApi.removeVip(serverId, player_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hll-vips", serverId] }),
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Only send changed values
    const changes: Record<string, unknown> = {};
    for (const field of SETTING_FIELDS) {
      const k = field.key as string;
      if (settings && form[k] !== undefined && form[k] !== (settings as Record<string, unknown>)[k]) {
        changes[k] = form[k];
      }
    }
    if (Object.keys(changes).length === 0) return;
    updateSettings.mutate(changes);
  };

  const vips: HLLVip[] = Array.isArray(vipsData) ? vipsData : vipsData?.vips ?? [];

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all";
  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-[#ff4757]" style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.15)" }}>
          {error}
        </div>
      )}

      {/* Server Settings */}
      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider mb-5">Game Settings</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SETTING_FIELDS.map((field) => {
              const k = field.key as string;
              const val = form[k];
              if (field.type === "toggle") {
                return (
                  <div key={k} className="flex items-center justify-between rounded-lg px-3 py-3" style={{ background: "#1a1f2e" }}>
                    <div>
                      <div className="text-sm font-medium text-[#e2e8f0]">{field.label}</div>
                      {field.description && <div className="text-[11px] text-[#64748b] mt-0.5">{field.description}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, [k]: !val })}
                      className="relative w-10 h-5 rounded-full transition-colors"
                      style={{ background: val ? "#00d4aa" : "#374151" }}
                    >
                      <span
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                        style={{ left: val ? "calc(100% - 18px)" : "2px" }}
                      />
                    </button>
                  </div>
                );
              }
              return (
                <div key={k}>
                  <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                    {field.label} {field.suffix && <span className="text-[#64748b] normal-case">({field.suffix})</span>}
                  </label>
                  <input
                    type="number"
                    value={val !== undefined && val !== null ? String(val) : ""}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value ? parseInt(e.target.value) : undefined })}
                    className={inputCls}
                    style={inputStyle}
                  />
                  {field.description && <div className="text-[10px] text-[#64748b] mt-1">{field.description}</div>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button
              type="submit"
              disabled={updateSettings.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all"
              style={{ background: "#00d4aa" }}
            >
              <Save className="h-3.5 w-3.5" />
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </button>
            {saved && <span className="text-sm text-[#00d4aa] font-medium animate-fade-in">Saved!</span>}
          </div>
        </form>
      </div>

      {/* VIP Management */}
      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider flex items-center gap-2">
            <Star className="h-4 w-4 text-[#fbbf24]" /> VIP Management
          </h3>
          <button
            onClick={() => setShowAddVip(!showAddVip)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
            style={{ background: showAddVip ? "rgba(255,71,87,0.1)" : "rgba(251,191,36,0.1)", color: showAddVip ? "#ff4757" : "#fbbf24" }}
          >
            {showAddVip ? <><X className="h-3 w-3" /> Cancel</> : <><Plus className="h-3 w-3" /> Add VIP</>}
          </button>
        </div>

        {showAddVip && (
          <div className="rounded-lg p-3 mb-4" style={{ background: "#1a1f2e", border: "1px solid rgba(251,191,36,0.15)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={vipId}
                onChange={(e) => setVipId(e.target.value)}
                placeholder="Steam ID / Player ID"
                className={inputCls}
                style={inputStyle}
              />
              <input
                type="text"
                value={vipComment}
                onChange={(e) => setVipComment(e.target.value)}
                placeholder="Comment (optional)"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => addVip.mutate()}
              disabled={!vipId.trim() || addVip.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50"
              style={{ background: "#fbbf24" }}
            >
              <Plus className="h-3 w-3" />
              {addVip.isPending ? "Adding..." : "Add VIP"}
            </button>
          </div>
        )}

        {vipsLoading ? (
          <div className="text-sm text-[#64748b] text-center py-6">Loading VIPs...</div>
        ) : vips.length === 0 ? (
          <div className="text-sm text-[#64748b] text-center py-6">No VIPs configured</div>
        ) : (
          <div className="space-y-1">
            {vips.map((vip) => (
              <div
                key={vip.player_id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 group hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 text-[#fbbf24] shrink-0" />
                    <span className="text-sm text-[#e2e8f0] font-medium truncate">{vip.name || vip.player_id}</span>
                    {vip.name && (
                      <span className="text-[11px] text-[#64748b] font-mono truncate">{vip.player_id}</span>
                    )}
                  </div>
                  {vip.comment && <div className="text-[11px] text-[#64748b] ml-5 mt-0.5">{vip.comment}</div>}
                </div>
                <button
                  onClick={() => removeVip.mutate(vip.player_id)}
                  className="p-1.5 rounded-md text-[#64748b] hover:text-[#ff4757] hover:bg-[rgba(255,71,87,0.08)] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Remove VIP"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
