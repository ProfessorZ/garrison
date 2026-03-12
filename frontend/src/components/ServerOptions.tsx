import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,

  Shield,
  Gamepad2,
  MessageSquare,
  Home,
  Car,
  Map,
  Package,
  Mic,
  Settings,
  Server,
  Globe,
  Eye,
  Wifi,
} from "lucide-react";
import { serverOptionsApi } from "../api/serverOptions";
import type { ServerOption } from "../types";

interface Props {
  serverId: number;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Shield; accent: string; description: string }> = {
  // Shared / PZ categories
  "Gameplay": { icon: Gamepad2, accent: "#00d4aa", description: "Core game mechanics and rules" },
  "Server": { icon: Server, accent: "#818cf8", description: "Server performance and configuration" },
  "Safehouse": { icon: Home, accent: "#fbbf24", description: "Player safehouse rules" },
  "Chat": { icon: MessageSquare, accent: "#38bdf8", description: "In-game chat settings" },
  "Anti-Cheat": { icon: Shield, accent: "#f472b6", description: "Anti-cheat protection levels" },
  "Vehicles": { icon: Car, accent: "#fb923c", description: "Vehicle spawning and behavior" },
  "Map": { icon: Map, accent: "#a78bfa", description: "World and map configuration" },
  "Mods": { icon: Package, accent: "#34d399", description: "Mod management" },
  "Voice": { icon: Mic, accent: "#f87171", description: "Voice chat settings" },
  // Factorio categories
  "General": { icon: Globe, accent: "#38bdf8", description: "Server name, description, and access" },
  "Network": { icon: Wifi, accent: "#fb923c", description: "Upload and bandwidth settings" },
  "Visibility": { icon: Eye, accent: "#a78bfa", description: "Server browser visibility" },
  // Fallback
  "Other": { icon: Settings, accent: "#94a3b8", description: "Miscellaneous settings" },
};

const CATEGORY_ORDER = Object.keys(CATEGORY_CONFIG);

export default function ServerOptions({ serverId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["server-options", serverId];

  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [savingOption, setSavingOption] = useState<string | null>(null);

  const { data: options = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => serverOptionsApi.list(serverId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      serverOptionsApi.update(serverId, name, value),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey });
      setChanges((prev) => { const next = { ...prev }; delete next[name]; return next; });
      setSavingOption(null);
    },
    onError: () => setSavingOption(null),
  });

  const bulkMutation = useMutation({
    mutationFn: (opts: Record<string, string>) =>
      serverOptionsApi.bulkUpdate(serverId, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setChanges({});
    },
  });

  const grouped = useMemo(() => {
    const filtered = options.filter(
      (opt) =>
        !search ||
        opt.name.toLowerCase().includes(search.toLowerCase()) ||
        opt.description.toLowerCase().includes(search.toLowerCase()) ||
        opt.category.toLowerCase().includes(search.toLowerCase())
    );
    const groups: Record<string, ServerOption[]> = {};
    for (const opt of filtered) {
      if (!groups[opt.category]) groups[opt.category] = [];
      groups[opt.category].push(opt);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [options, search]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const getDisplayValue = (opt: ServerOption): string => changes[opt.name] ?? opt.value;

  const setOptionValue = (name: string, value: string, original: string) => {
    if (value === original) {
      setChanges((prev) => { const next = { ...prev }; delete next[name]; return next; });
    } else {
      setChanges((prev) => ({ ...prev, [name]: value }));
    }
  };

  const saveOne = (name: string) => {
    const value = changes[name];
    if (value === undefined) return;
    setSavingOption(name);
    updateMutation.mutate({ name, value });
  };

  const changedCount = Object.keys(changes).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
        <p className="text-sm text-[#64748b]">Loading server options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,71,87,0.04)", border: "1px solid rgba(255,71,87,0.12)" }}>
        <p className="text-sm text-[#ff4757] font-semibold">Failed to load server options</p>
        <p className="text-xs text-[#64748b] mt-1">Make sure the server is online and RCON is accessible.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Server Configuration</h3>
          <p className="text-sm text-[#64748b] mt-1">{options.length} options across {grouped.length} categories</p>
        </div>
        {changedCount > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "rgba(255,165,2,0.08)" }}>
              <span className="h-2 w-2 rounded-full bg-[#ffa502] animate-pulse" />
              <span className="text-xs text-[#ffa502] font-bold">{changedCount} unsaved</span>
            </div>
            <button onClick={() => setChanges({})}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-[#e2e8f0] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)]"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button onClick={() => bulkMutation.mutate(changes)} disabled={bulkMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #00d4aa, #00b894)" }}>
              <Save className="h-3 w-3" /> {bulkMutation.isPending ? "Saving..." : "Save All"}
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b] pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search options..."
          className="w-full rounded-2xl pl-12 pr-4 py-3.5 text-sm text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none transition-all duration-200"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,170,0.3)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.06)")}
        />
      </div>

      {/* Categories */}
      {grouped.map(([category, opts]) => {
        const isCollapsed = collapsedCategories.has(category);
        const hasChanges = opts.some((o) => o.name in changes);
        const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG["Other"];
        const Icon = config.icon;

        return (
          <div key={category} className="rounded-2xl overflow-hidden transition-all duration-200"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-4 px-6 py-5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
            >
              <div className="rounded-xl p-2.5" style={{ background: `${config.accent}12` }}>
                <Icon className="h-4 w-4" style={{ color: config.accent }} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{category}</span>
                  <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">{opts.length} options</span>
                  {hasChanges && <span className="h-2 w-2 rounded-full bg-[#ffa502] animate-pulse" />}
                </div>
                <p className="text-xs text-[#4a5568] mt-0.5">{config.description}</p>
              </div>
              {isCollapsed
                ? <ChevronRight className="h-4 w-4 text-[#374151]" />
                : <ChevronDown className="h-4 w-4 text-[#374151]" />
              }
            </button>

            {/* Options */}
            {!isCollapsed && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {opts.map((opt, idx) => {
                  const displayVal = getDisplayValue(opt);
                  const isChanged = opt.name in changes;

                  return (
                    <div
                      key={opt.name}
                      className="flex items-center justify-between gap-8 px-6 py-5 transition-colors hover:bg-[rgba(255,255,255,0.025)]"
                      style={{
                        background: isChanged ? "rgba(255,165,2,0.03)" : idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
                        borderBottom: idx < opts.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      }}
                    >
                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold ${isChanged ? "text-[#ffa502]" : "text-[#e2e8f0]"}`}>
                            {opt.name}
                          </span>
                          {isChanged && (
                            <span className="text-[9px] font-bold text-[#ffa502] uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(255,165,2,0.08)" }}>
                              modified
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p className="text-xs text-[#4a5568] mt-1">{opt.description}</p>
                        )}
                      </div>

                      {/* Control — fixed width for alignment */}
                      <div className="flex items-center justify-end gap-3 shrink-0 w-52">
                        {opt.type === "boolean" ? (
                          <button
                            onClick={() => setOptionValue(opt.name, displayVal === "true" ? "false" : "true", opt.value)}
                            className="relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none"
                            style={{
                              background: displayVal === "true"
                                ? "linear-gradient(135deg, #00d4aa, #00b894)"
                                : "#1a1f2e",
                              boxShadow: displayVal === "true" ? "0 0 12px rgba(0,212,170,0.3)" : "none",
                            }}
                          >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                              displayVal === "true" ? "left-[26px]" : "left-0.5"
                            }`} />
                          </button>
                        ) : opt.type === "number" ? (
                          <div className="flex items-center gap-0.5 rounded-xl overflow-hidden"
                            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                            <button
                              onClick={() => {
                                const n = parseFloat(displayVal) || 0;
                                const step = n % 1 !== 0 ? 0.1 : 1;
                                setOptionValue(opt.name, n % 1 !== 0 ? Math.max(0, n - step).toFixed(1) : String(Math.max(0, n - step)), opt.value);
                              }}
                              className="px-3 py-1.5 text-sm font-bold text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
                              style={{ background: "#0f1420" }}
                            >−</button>
                            <input
                              type="text"
                              value={displayVal}
                              onChange={(e) => setOptionValue(opt.name, e.target.value, opt.value)}
                              className="w-16 py-1.5 text-sm text-center text-white focus:outline-none tabular-nums"
                              style={{ background: "#0f1420", fontFamily: "var(--font-mono)" }}
                            />
                            <button
                              onClick={() => {
                                const n = parseFloat(displayVal) || 0;
                                const step = n % 1 !== 0 ? 0.1 : 1;
                                setOptionValue(opt.name, n % 1 !== 0 ? (n + step).toFixed(1) : String(n + step), opt.value);
                              }}
                              className="px-3 py-1.5 text-sm font-bold text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
                              style={{ background: "#0f1420" }}
                            >+</button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={displayVal}
                            onChange={(e) => setOptionValue(opt.name, e.target.value, opt.value)}
                            className="w-52 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-all duration-200"
                            style={{
                              background: "#0f1420",
                              border: "1px solid rgba(255,255,255,0.08)",
                              fontFamily: "var(--font-mono)",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,170,0.3)")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                          />
                        )}

                        {isChanged && (
                          <button
                            onClick={() => saveOne(opt.name)}
                            disabled={savingOption === opt.name}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-200 hover:scale-105"
                            style={{ background: "#00d4aa" }}
                          >
                            {savingOption === opt.name ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#0a0e1a] border-r-transparent" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {grouped.length === 0 && !isLoading && (
        <div className="text-center py-16 rounded-2xl" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Search className="h-6 w-6 text-[#374151] mx-auto mb-3" />
          <p className="text-sm text-[#94a3b8]">
            {search ? `No options match "${search}"` : "No server options available."}
          </p>
        </div>
      )}
    </div>
  );
}
