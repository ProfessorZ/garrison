import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { serverOptionsApi } from "../api/serverOptions";
import type { ServerOption } from "../types";

interface Props {
  serverId: number;
}

const CATEGORY_ORDER = [
  "Gameplay", "Server", "Safehouse", "Chat", "Anti-Cheat",
  "Vehicles", "Map", "Mods", "Voice", "Other",
];

export default function ServerOptions({ serverId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["server-options", serverId];

  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [_hoveredOption, setHoveredOption] = useState<string | null>(null);
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
      <div className="flex items-center justify-center h-32">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,71,87,0.06)", border: "1px solid rgba(255,71,87,0.12)" }}>
        <p className="text-sm text-[#ff4757]">Failed to load server options. Make sure the server is online.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + bulk actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748b]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search options..."
            className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </div>
        {changedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#ffa502] font-bold">{changedCount} unsaved</span>
            <button onClick={() => setChanges({})}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}>
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button onClick={() => bulkMutation.mutate(changes)} disabled={bulkMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
              style={{ background: "#00d4aa" }}>
              <Save className="h-3 w-3" /> {bulkMutation.isPending ? "Saving..." : "Save All"}
            </button>
          </div>
        )}
      </div>

      {/* Options grouped by category */}
      {grouped.map(([category, opts]) => {
        const isCollapsed = collapsedCategories.has(category);
        const hasChanges = opts.some((o) => o.name in changes);

        return (
          <div key={category} className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-[#64748b]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#64748b]" />}
                <span className="text-sm font-bold text-[#e2e8f0]">{category}</span>
                <span className="text-xs text-[#64748b]">{opts.length} option{opts.length !== 1 ? "s" : ""}</span>
              </div>
              {hasChanges && <span className="h-2 w-2 rounded-full bg-[#ffa502]" />}
            </button>

            {!isCollapsed && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {opts.map((opt) => {
                  const displayVal = getDisplayValue(opt);
                  const isChanged = opt.name in changes;

                  return (
                    <div
                      key={opt.name}
                      className="px-5 py-3 flex items-center gap-4 transition-colors"
                      style={{
                        background: isChanged ? "rgba(255,165,2,0.03)" : "transparent",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                      }}
                      onMouseEnter={() => setHoveredOption(opt.name)}
                      onMouseLeave={() => setHoveredOption(null)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm ${isChanged ? "text-[#ffa502] font-bold" : "text-[#e2e8f0]"}`}>
                            {opt.name}
                          </span>
                          {opt.description && (
                            <div className="relative group">
                              <Info className="h-3 w-3 text-[#64748b] cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block rounded-lg px-3 py-2 text-xs text-[#e2e8f0] whitespace-nowrap z-20 shadow-2xl"
                                style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
                                {opt.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {opt.type === "boolean" ? (
                          <button
                            onClick={() => setOptionValue(opt.name, displayVal === "true" ? "false" : "true", opt.value)}
                            className={`toggle-switch ${displayVal === "true" ? "active" : ""}`}
                          />
                        ) : opt.type === "number" ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const n = parseFloat(displayVal) || 0;
                                const step = n % 1 !== 0 ? 0.1 : 1;
                                const newVal = Math.max(0, n - step);
                                setOptionValue(opt.name, n % 1 !== 0 ? newVal.toFixed(1) : String(newVal), opt.value);
                              }}
                              className="rounded-md px-2 py-0.5 text-xs text-[#e2e8f0] transition-all duration-150"
                              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                            >-</button>
                            <input
                              type="text"
                              value={displayVal}
                              onChange={(e) => setOptionValue(opt.name, e.target.value, opt.value)}
                              className="w-20 rounded-md px-2 py-1 text-xs text-center text-[#e2e8f0] focus:outline-none"
                              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "var(--font-mono)" }}
                            />
                            <button
                              onClick={() => {
                                const n = parseFloat(displayVal) || 0;
                                const step = n % 1 !== 0 ? 0.1 : 1;
                                const newVal = n + step;
                                setOptionValue(opt.name, n % 1 !== 0 ? newVal.toFixed(1) : String(newVal), opt.value);
                              }}
                              className="rounded-md px-2 py-0.5 text-xs text-[#e2e8f0] transition-all duration-150"
                              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                            >+</button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={displayVal}
                            onChange={(e) => setOptionValue(opt.name, e.target.value, opt.value)}
                            className="w-48 rounded-md px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none"
                            style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "var(--font-mono)" }}
                          />
                        )}

                        {isChanged && (
                          <button
                            onClick={() => saveOne(opt.name)}
                            disabled={savingOption === opt.name}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
                            style={{ background: "#00d4aa" }}
                          >
                            <Save className="h-3 w-3" />
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
        <div className="text-center py-12 rounded-xl" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm text-[#94a3b8]">
            {search ? "No options match your search." : "No server options available."}
          </p>
        </div>
      )}
    </div>
  );
}
