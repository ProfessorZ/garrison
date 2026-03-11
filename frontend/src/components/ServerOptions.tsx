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

// Category ordering
const CATEGORY_ORDER = [
  "Gameplay",
  "Server",
  "Safehouse",
  "Chat",
  "Anti-Cheat",
  "Vehicles",
  "Map",
  "Mods",
  "Voice",
  "Other",
];

export default function ServerOptions({ serverId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["server-options", serverId];

  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
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
      setChanges((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
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

  // Group by category
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

    // Sort categories by predefined order
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [options, search]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const getDisplayValue = (opt: ServerOption): string => {
    return changes[opt.name] ?? opt.value;
  };

  const setOptionValue = (name: string, value: string, original: string) => {
    if (value === original) {
      setChanges((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
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
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-sm text-red-400">
          Failed to load server options. Make sure the server is online.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + bulk actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search options..."
            className="w-full rounded-md bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {changedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400">
              {changedCount} unsaved
            </span>
            <button
              onClick={() => setChanges({})}
              className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button
              onClick={() => bulkMutation.mutate(changes)}
              disabled={bulkMutation.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <Save className="h-3 w-3" />
              {bulkMutation.isPending ? "Saving..." : "Save All"}
            </button>
          </div>
        )}
      </div>

      {/* Options grouped by category */}
      {grouped.map(([category, opts]) => {
        const isCollapsed = collapsedCategories.has(category);
        const hasChanges = opts.some((o) => o.name in changes);

        return (
          <div
            key={category}
            className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
          >
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span className="text-sm font-semibold text-slate-200">
                  {category}
                </span>
                <span className="text-xs text-slate-500">
                  {opts.length} option{opts.length !== 1 ? "s" : ""}
                </span>
              </div>
              {hasChanges && (
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Options list */}
            {!isCollapsed && (
              <div className="border-t border-slate-700 divide-y divide-slate-700/50">
                {opts.map((opt) => {
                  const displayVal = getDisplayValue(opt);
                  const isChanged = opt.name in changes;

                  return (
                    <div
                      key={opt.name}
                      className={`px-4 py-2.5 flex items-center gap-4 ${
                        isChanged ? "bg-amber-500/5" : ""
                      }`}
                      onMouseEnter={() => setHoveredOption(opt.name)}
                      onMouseLeave={() => setHoveredOption(null)}
                    >
                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm ${
                              isChanged
                                ? "text-amber-300 font-medium"
                                : "text-slate-300"
                            }`}
                          >
                            {opt.name}
                          </span>
                          {opt.description && (
                            <div className="relative group">
                              <Info className="h-3 w-3 text-slate-600 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 whitespace-nowrap z-20 shadow-lg">
                                {opt.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Input */}
                      <div className="flex items-center gap-2 shrink-0">
                        {opt.type === "boolean" ? (
                          <button
                            onClick={() =>
                              setOptionValue(
                                opt.name,
                                displayVal === "true" ? "false" : "true",
                                opt.value
                              )
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              displayVal === "true"
                                ? "bg-emerald-600"
                                : "bg-slate-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                                displayVal === "true"
                                  ? "translate-x-4.5"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        ) : opt.type === "number" ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const n = parseFloat(displayVal) || 0;
                                const step = n % 1 !== 0 ? 0.1 : 1;
                                const newVal = Math.max(0, n - step);
                                setOptionValue(
                                  opt.name,
                                  n % 1 !== 0
                                    ? newVal.toFixed(1)
                                    : String(newVal),
                                  opt.value
                                );
                              }}
                              className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              value={displayVal}
                              onChange={(e) =>
                                setOptionValue(
                                  opt.name,
                                  e.target.value,
                                  opt.value
                                )
                              }
                              className="w-20 rounded bg-slate-700 border border-slate-600 px-2 py-1 text-xs text-center text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => {
                                const n = parseFloat(displayVal) || 0;
                                const step = n % 1 !== 0 ? 0.1 : 1;
                                const newVal = n + step;
                                setOptionValue(
                                  opt.name,
                                  n % 1 !== 0
                                    ? newVal.toFixed(1)
                                    : String(newVal),
                                  opt.value
                                );
                              }}
                              className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={displayVal}
                            onChange={(e) =>
                              setOptionValue(
                                opt.name,
                                e.target.value,
                                opt.value
                              )
                            }
                            className="w-48 rounded bg-slate-700 border border-slate-600 px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                          />
                        )}

                        {/* Per-option save */}
                        {isChanged && (
                          <button
                            onClick={() => saveOne(opt.name)}
                            disabled={savingOption === opt.name}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
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
        <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
          <p className="text-sm text-slate-500">
            {search
              ? "No options match your search."
              : "No server options available."}
          </p>
        </div>
      )}
    </div>
  );
}
