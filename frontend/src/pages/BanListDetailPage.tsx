import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Server,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Globe,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Edit2,
} from "lucide-react";
import { banListsApi } from "../api/banLists";
import { serversApi } from "../api/servers";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Tab = "entries" | "servers" | "import-export";

export default function BanListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const banListId = Number(id);

  const [tab, setTab] = useState<Tab>("entries");
  const [entryPage, setEntryPage] = useState(1);
  const [entrySearch, setEntrySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Add entry form
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newReason, setNewReason] = useState("");

  // Add server form
  const [showAddServer, setShowAddServer] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<number | "">("");
  const [autoEnforce, setAutoEnforce] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGlobal, setEditGlobal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(entrySearch);
      setEntryPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [entrySearch]);

  const { data: banList, isLoading } = useQuery({
    queryKey: ["ban-list", banListId],
    queryFn: () => banListsApi.get(banListId),
    enabled: !isNaN(banListId),
  });

  const { data: entriesData } = useQuery({
    queryKey: ["ban-list-entries", banListId, entryPage, debouncedSearch],
    queryFn: () =>
      banListsApi.listEntries(banListId, {
        page: entryPage,
        search: debouncedSearch || undefined,
      }),
    enabled: !isNaN(banListId) && tab === "entries",
  });

  const { data: allServers = [] } = useQuery({
    queryKey: ["servers-list"],
    queryFn: () => serversApi.list(),
  });

  useEffect(() => {
    if (banList) {
      setEditName(banList.name);
      setEditDescription(banList.description || "");
      setEditGlobal(banList.is_global);
    }
  }, [banList]);

  const updateMutation = useMutation({
    mutationFn: () =>
      banListsApi.update(banListId, {
        name: editName,
        description: editDescription || undefined,
        is_global: editGlobal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban-list", banListId] });
      queryClient.invalidateQueries({ queryKey: ["ban-lists"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => banListsApi.delete(banListId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban-lists"] });
      navigate("/ban-lists");
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: () =>
      banListsApi.addEntry(banListId, {
        player_name: newPlayerName,
        reason: newReason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ban-list-entries", banListId],
      });
      queryClient.invalidateQueries({ queryKey: ["ban-list", banListId] });
      setShowAddEntry(false);
      setNewPlayerName("");
      setNewReason("");
    },
  });

  const removeEntryMutation = useMutation({
    mutationFn: (entryId: number) =>
      banListsApi.removeEntry(banListId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ban-list-entries", banListId],
      });
      queryClient.invalidateQueries({ queryKey: ["ban-list", banListId] });
    },
  });

  const assignServerMutation = useMutation({
    mutationFn: () =>
      banListsApi.assignServer(banListId, {
        server_id: Number(selectedServerId),
        auto_enforce: autoEnforce,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban-list", banListId] });
      setShowAddServer(false);
      setSelectedServerId("");
      setAutoEnforce(false);
    },
  });

  const unassignServerMutation = useMutation({
    mutationFn: (serverId: number) =>
      banListsApi.unassignServer(banListId, serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban-list", banListId] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (serverId: number) =>
      banListsApi.syncToServer(banListId, serverId),
  });

  const importServerMutation = useMutation({
    mutationFn: (serverId: number) =>
      banListsApi.importFromServer(banListId, serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ban-list-entries", banListId],
      });
      queryClient.invalidateQueries({ queryKey: ["ban-list", banListId] });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: (file: File) => banListsApi.importCsv(banListId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ban-list-entries", banListId],
      });
      queryClient.invalidateQueries({ queryKey: ["ban-list", banListId] });
    },
  });

  if (isLoading || !banList) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="h-4 w-28 rounded bg-[#1a1f2e] animate-pulse mb-5" />
        <div
          className="rounded-xl p-6 mb-6"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="h-6 w-48 rounded bg-[#1a1f2e] animate-pulse mb-2" />
          <div className="h-3 w-32 rounded bg-[#1a1f2e] animate-pulse" />
        </div>
      </div>
    );
  }

  const entries = entriesData?.items ?? [];
  const entryPages = entriesData?.pages ?? 1;
  const servers = banList.servers ?? [];

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "entries", label: "Entries", icon: Users },
    { key: "servers", label: "Servers", icon: Server },
    { key: "import-export", label: "Import / Export", icon: Download },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Back */}
      <Link
        to="/ban-lists"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#e2e8f0] mb-5 transition-colors font-medium"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to ban lists
      </Link>

      {/* Header */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none"
              style={{
                background: "#1a1f2e",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
              style={{
                background: "#1a1f2e",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <label className="flex items-center gap-2 text-sm text-[#e2e8f0] cursor-pointer">
              <input
                type="checkbox"
                checked={editGlobal}
                onChange={(e) => setEditGlobal(e.target.checked)}
                className="rounded"
              />
              Global list
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a]"
                style={{ background: "#00d4aa" }}
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-4 py-2 text-xs font-medium text-[#94a3b8]"
                style={{
                  background: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-2xl font-bold text-[#e2e8f0]">
                  {banList.name}
                </h2>
                {banList.is_global && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#ffa502] bg-[rgba(255,165,2,0.08)]">
                    <Globe className="h-2.5 w-2.5" />
                    GLOBAL
                  </span>
                )}
              </div>
              {banList.description && (
                <p className="text-sm text-[#64748b]">{banList.description}</p>
              )}
              <p className="text-xs text-[#64748b] mt-1">
                Created by {banList.created_by_username || "Unknown"} on{" "}
                {formatDate(banList.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
                style={{
                  background: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this ban list?"))
                    deleteMutation.mutate();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#ff4757] transition-all duration-150"
                style={{
                  background: "rgba(255,71,87,0.08)",
                  border: "1px solid rgba(255,71,87,0.12)",
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Active Entries",
            value: banList.entry_count,
            icon: Users,
            accent: "#ff4757",
          },
          {
            label: "Servers",
            value: banList.server_count,
            icon: Server,
            accent: "#00d4aa",
          },
          {
            label: "Type",
            value: banList.is_global ? "Global" : "Selective",
            icon: Globe,
            accent: "#ffa502",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="rounded-lg p-1.5"
                  style={{ background: `${stat.accent}15` }}
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: stat.accent }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="text-xl font-black text-white tabular-nums">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0 mb-5 overflow-x-auto"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 ${
                active
                  ? "text-[#00d4aa]"
                  : "text-[#64748b] hover:text-[#e2e8f0]"
              }`}
              style={{
                background: "transparent",
                borderRadius: 0,
                borderBottom: active
                  ? "2px solid #00d4aa"
                  : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={tab}>
        {/* Entries Tab */}
        {tab === "entries" && (
          <div>
            {/* Search + Add */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b] pointer-events-none" />
                <input
                  type="text"
                  value={entrySearch}
                  onChange={(e) => setEntrySearch(e.target.value)}
                  placeholder="Search entries..."
                  className="w-full rounded-lg pl-10 pr-4 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                />
              </div>
              <button
                onClick={() => setShowAddEntry(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#0a0e1a] shrink-0"
                style={{ background: "#00d4aa" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Entry
              </button>
            </div>

            {/* Add entry form */}
            {showAddEntry && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#e2e8f0]">
                    Add Player to List
                  </h4>
                  <button
                    onClick={() => setShowAddEntry(false)}
                    className="text-[#64748b] hover:text-[#e2e8f0]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Player name"
                    className="flex-1 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  />
                  <input
                    type="text"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  />
                  <button
                    onClick={() => addEntryMutation.mutate()}
                    disabled={
                      !newPlayerName.trim() || addEntryMutation.isPending
                    }
                    className="rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 shrink-0"
                    style={{ background: "#00d4aa" }}
                  >
                    {addEntryMutation.isPending ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            )}

            {/* Entries table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {entries.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                  <p className="text-sm text-[#94a3b8]">
                    {debouncedSearch
                      ? "No matching entries"
                      : "No entries yet"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr
                          style={{
                            borderBottom:
                              "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                            Player
                          </th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                            Reason
                          </th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                            Added By
                          </th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                            Expires
                          </th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e, i) => (
                          <tr
                            key={e.id}
                            className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                            style={{
                              borderBottom:
                                "1px solid rgba(255,255,255,0.03)",
                              background:
                                i % 2 === 1
                                  ? "rgba(255,255,255,0.01)"
                                  : "transparent",
                            }}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#e2e8f0] shrink-0"
                                  style={{ background: "#1a1f2e" }}
                                >
                                  {e.player_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-[#e2e8f0]">
                                    {e.player_name}
                                  </span>
                                  {!e.is_active && (
                                    <span className="ml-2 text-[10px] font-bold text-[#64748b] bg-[rgba(255,255,255,0.03)] rounded-full px-2 py-0.5">
                                      INACTIVE
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-[#94a3b8] max-w-xs truncate">
                              {e.reason || "—"}
                            </td>
                            <td className="px-5 py-3 text-xs text-[#64748b]">
                              {e.added_by_username || "—"}
                            </td>
                            <td className="px-5 py-3 text-xs text-[#64748b]">
                              {e.expires_at ? (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(e.expires_at)}
                                </span>
                              ) : (
                                <span className="text-[#ff4757]">
                                  Permanent
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() =>
                                  removeEntryMutation.mutate(e.id)
                                }
                                className="text-[#64748b] hover:text-[#ff4757] transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {entryPages > 1 && (
                    <div
                      className="flex items-center justify-between px-5 py-3"
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span className="text-xs text-[#64748b]">
                        Page {entryPage} of {entryPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setEntryPage((p) => Math.max(1, p - 1))
                          }
                          disabled={entryPage <= 1}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#e2e8f0] disabled:opacity-30"
                          style={{
                            background: "#1a1f2e",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <ChevronLeft className="h-3 w-3" /> Prev
                        </button>
                        <button
                          onClick={() =>
                            setEntryPage((p) =>
                              Math.min(entryPages, p + 1)
                            )
                          }
                          disabled={entryPage >= entryPages}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#e2e8f0] disabled:opacity-30"
                          style={{
                            background: "#1a1f2e",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          Next <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Servers Tab */}
        {tab === "servers" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddServer(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#0a0e1a]"
                style={{ background: "#00d4aa" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Assign Server
              </button>
            </div>

            {showAddServer && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#e2e8f0]">
                    Assign Server
                  </h4>
                  <button
                    onClick={() => setShowAddServer(false)}
                    className="text-[#64748b] hover:text-[#e2e8f0]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <select
                    value={selectedServerId}
                    onChange={(e) =>
                      setSelectedServerId(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none"
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <option value="">Select server...</option>
                    {allServers
                      .filter(
                        (s) =>
                          !servers.some((ss) => ss.server_id === s.id)
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-[#e2e8f0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEnforce}
                      onChange={(e) => setAutoEnforce(e.target.checked)}
                      className="rounded"
                    />
                    Auto-enforce (kick banned players on join)
                  </label>
                  <button
                    onClick={() => assignServerMutation.mutate()}
                    disabled={
                      !selectedServerId || assignServerMutation.isPending
                    }
                    className="rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50"
                    style={{ background: "#00d4aa" }}
                  >
                    Assign
                  </button>
                </div>
              </div>
            )}

            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {servers.length === 0 ? (
                <div className="py-16 text-center">
                  <Server className="h-8 w-8 text-[#1a1f2e] mx-auto mb-3" />
                  <p className="text-sm text-[#94a3b8]">
                    No servers assigned
                  </p>
                  <p className="text-xs text-[#64748b] mt-1">
                    {banList.is_global
                      ? "This is a global list — it applies to all servers automatically"
                      : "Assign servers to apply this ban list"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                  {servers.map((s) => (
                    <div
                      key={s.server_id}
                      className="flex items-center justify-between p-5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#e2e8f0]">
                          {s.server_name || `Server #${s.server_id}`}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {s.auto_enforce ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00d4aa] bg-[rgba(0,212,170,0.08)] rounded-full px-2 py-0.5">
                              <Shield className="h-2.5 w-2.5" />
                              AUTO-ENFORCE
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#64748b]">
                              Manual only
                            </span>
                          )}
                          <span className="text-xs text-[#64748b]">
                            Added {formatDate(s.added_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => syncMutation.mutate(s.server_id)}
                          disabled={syncMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
                          style={{
                            background: "#1a1f2e",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                          title="Push bans to server"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${syncMutation.isPending ? "animate-spin" : ""}`}
                          />
                          Sync
                        </button>
                        <button
                          onClick={() =>
                            importServerMutation.mutate(s.server_id)
                          }
                          disabled={importServerMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
                          style={{
                            background: "#1a1f2e",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                          title="Import bans from server"
                        >
                          <Download className="h-3 w-3" />
                          Import
                        </button>
                        <button
                          onClick={() =>
                            unassignServerMutation.mutate(s.server_id)
                          }
                          className="text-[#64748b] hover:text-[#ff4757] transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import/Export Tab */}
        {tab === "import-export" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-4 w-4 text-[#00d4aa]" />
                <h3 className="text-sm font-bold text-[#e2e8f0]">
                  Export CSV
                </h3>
              </div>
              <p className="text-xs text-[#64748b] mb-4">
                Download all active entries as a CSV file
              </p>
              <button
                onClick={async () => {
                  const csv = await banListsApi.exportCsv(banListId);
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${banList.name}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a]"
                style={{ background: "#00d4aa" }}
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </button>
            </div>

            {/* Import */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-4 w-4 text-[#818cf8]" />
                <h3 className="text-sm font-bold text-[#e2e8f0]">
                  Import CSV
                </h3>
              </div>
              <p className="text-xs text-[#64748b] mb-4">
                Upload a CSV with columns: name, reason, expires_at
              </p>
              <label
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white cursor-pointer"
                style={{ background: "#818cf8" }}
              >
                <Upload className="h-3.5 w-3.5" />
                {importCsvMutation.isPending
                  ? "Importing..."
                  : "Upload CSV"}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importCsvMutation.mutate(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {importCsvMutation.isSuccess && (
                <p className="text-xs text-[#00d4aa] mt-2">
                  Imported {(importCsvMutation.data as any)?.imported ?? 0}{" "}
                  entries
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
