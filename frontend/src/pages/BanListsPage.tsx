import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { List, Plus, Globe, Server, Users, X, FileText, Trash2, Clock } from "lucide-react";
import { banListsApi } from "../api/banLists";
import { banTemplatesApi } from "../api/banTemplates";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BanListsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);

  const { data: banLists = [], isLoading } = useQuery({
    queryKey: ["ban-lists"],
    queryFn: banListsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      banListsApi.create({
        name,
        description: description || undefined,
        is_global: isGlobal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban-lists"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      setIsGlobal(false);
    },
  });

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Ban Lists
          </h2>
          <p className="text-[#64748b] mt-2">
            Shared ban lists for cross-server enforcement
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold text-[#0a0e1a] transition-all duration-150"
          style={{ background: "#00d4aa" }}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Ban List
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#e2e8f0]">
              Create Ban List
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-[#64748b] hover:text-[#e2e8f0] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="List name (e.g. Global Ban List)"
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
              style={{
                background: "#1a1f2e",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
              style={{
                background: "#1a1f2e",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <label className="flex items-center gap-2 text-sm text-[#e2e8f0] cursor-pointer">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                className="rounded"
              />
              Global list (applies to all servers by default)
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
                style={{ background: "#00d4aa" }}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-4 py-2 text-xs font-medium text-[#94a3b8] transition-all duration-150"
                style={{
                  background: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
          </div>
        ) : banLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <List className="h-8 w-8 text-[#1a1f2e] mb-3" />
            <p className="text-sm text-[#94a3b8]">No ban lists yet</p>
            <p className="text-xs text-[#64748b] mt-1">
              Create a ban list to start managing cross-server bans
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Entries
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Servers
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {banLists.map((bl, i) => (
                  <tr
                    key={bl.id}
                    onClick={() => navigate(`/ban-lists/${bl.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      background:
                        i % 2 === 1
                          ? "rgba(255,255,255,0.01)"
                          : "transparent",
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#e2e8f0]">
                          {bl.name}
                        </span>
                        {bl.is_global && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#ffa502] bg-[rgba(255,165,2,0.08)]">
                            <Globe className="h-2.5 w-2.5" />
                            GLOBAL
                          </span>
                        )}
                      </div>
                      {bl.description && (
                        <p className="text-xs text-[#64748b] mt-0.5 truncate max-w-xs">
                          {bl.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-[#94a3b8]">
                        <Users className="h-3 w-3" />
                        {bl.entry_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-[#94a3b8]">
                        <Server className="h-3 w-3" />
                        {bl.server_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#64748b]">
                      {bl.created_by_username || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#64748b]">
                      {formatDate(bl.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Ban Templates Section */}
      <BanTemplatesSection />
    </div>
  );
}


function BanTemplatesSection() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [durationHours, setDurationHours] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["ban-templates"],
    queryFn: banTemplatesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      banTemplatesApi.create({
        name,
        reason_template: reason,
        duration_hours: durationHours ? Number(durationHours) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban-templates"] });
      setShowCreate(false);
      setName("");
      setReason("");
      setDurationHours("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => banTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban-templates"] });
    },
  });

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Ban Templates
          </h2>
          <p className="text-[#64748b] mt-1 text-sm">
            Pre-fill ban reason and duration when banning players
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold text-[#0a0e1a] transition-all duration-150"
          style={{ background: "#00d4aa" }}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Template
        </button>
      </div>

      {showCreate && (
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#e2e8f0]">New Ban Template</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-[#64748b] hover:text-[#e2e8f0] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name (e.g. Cheating - 7 day)"
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
            />
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ban reason template"
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
            />
            <input
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              placeholder="Duration in hours (leave empty for permanent)"
              className="w-full rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
              min={1}
            />
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || !reason.trim() || createMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
                style={{ background: "#00d4aa" }}
              >
                {createMutation.isPending ? "Creating..." : "Create Template"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-4 py-2 text-xs font-medium text-[#94a3b8] transition-all duration-150"
                style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Cancel
              </button>
            </div>
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
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-8 w-8 text-[#1a1f2e] mb-3" />
            <p className="text-sm text-[#94a3b8]">No ban templates yet</p>
            <p className="text-xs text-[#64748b] mt-1">
              Templates pre-fill ban reason and duration when banning players
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.03)]">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#e2e8f0]">{t.name}</span>
                    {t.duration_hours != null ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#818cf8] bg-[rgba(129,140,248,0.08)] rounded-full px-2 py-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {t.duration_hours}h
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-medium text-[#ff4757] bg-[rgba(255,71,87,0.08)] rounded-full px-2 py-0.5">
                        PERMANENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748b] mt-0.5 truncate">{t.reason_template}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-[#64748b]">
                    by {t.created_by_username || "—"}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(t.id)}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 rounded-md p-1.5 text-[#64748b] hover:text-[#ff4757] hover:bg-[rgba(255,71,87,0.08)] transition-all duration-150"
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
  );
}
