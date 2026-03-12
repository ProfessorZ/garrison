import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, UserPlus, Trash2, Search } from "lucide-react";
import { permissionsApi } from "../api/permissions";
import { usersApi } from "../api/users";
import type { ServerPermission, User } from "../types";

interface ServerPermissionsProps {
  serverId: number;
}

const SERVER_ROLES = ["ADMIN", "MODERATOR", "VIEWER"];

const ROLE_COLORS: Record<string, { text: string; bg: string }> = {
  ADMIN: { text: "#ff4757", bg: "rgba(255,71,87,0.08)" },
  MODERATOR: { text: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  VIEWER: { text: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

export default function ServerPermissions({ serverId }: ServerPermissionsProps) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState("VIEWER");

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["server-permissions", serverId],
    queryFn: () => permissionsApi.list(serverId),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
    enabled: showAdd,
  });

  const availableUsers = allUsers.filter((u: User) => {
    if (permissions.some((p: ServerPermission) => p.user_id === u.id)) return false;
    if (u.role === "OWNER" || u.role === "ADMIN") return false;
    if (searchQuery) return u.username.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const grantMutation = useMutation({
    mutationFn: () => permissionsApi.grant(serverId, selectedUserId!, selectedRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-permissions", serverId] });
      setShowAdd(false);
      setSelectedUserId(null);
      setSearchQuery("");
      setSelectedRole("VIEWER");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) => permissionsApi.revoke(serverId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["server-permissions", serverId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      permissionsApi.grant(serverId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["server-permissions", serverId] }),
  });

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2 uppercase tracking-wider">
          <Shield className="h-4 w-4 text-[#00d4aa]" />
          Server Access
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0a0e1a] transition-all duration-150"
          style={{ background: "#00d4aa" }}
        >
          <UserPlus className="h-3.5 w-3.5" /> Add User
        </button>
      </div>

      {showAdd && (
        <div className="mb-5 p-4 rounded-xl space-y-3 animate-fade-in"
          style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748b]" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedUserId(null); }}
              placeholder="Search users..."
              className={`${inputCls} pl-9`}
              style={inputStyle}
            />
          </div>

          {searchQuery && availableUsers.length > 0 && !selectedUserId && (
            <div className="rounded-lg max-h-32 overflow-y-auto" style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}>
              {availableUsers.map((u: User) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUserId(u.id); setSearchQuery(u.username); }}
                  className="w-full text-left px-3 py-2 text-sm text-[#e2e8f0] transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {u.username}
                  <span className="text-xs text-[#64748b] ml-2">{u.role}</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && availableUsers.length === 0 && !selectedUserId && (
            <p className="text-xs text-[#64748b]">No matching users available.</p>
          )}

          <div className="flex items-center gap-3">
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={inputCls} style={inputStyle}>
              {SERVER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={() => grantMutation.mutate()}
              disabled={!selectedUserId || grantMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#0a0e1a] disabled:opacity-30 transition-all duration-150 shrink-0"
              style={{ background: "#00d4aa" }}
            >
              {grantMutation.isPending ? "Granting..." : "Grant Access"}
            </button>
          </div>

          {grantMutation.isError && <p className="text-xs text-[#ff4757]">Failed to grant access.</p>}
        </div>
      )}

      {permissions.length === 0 ? (
        <p className="text-sm text-[#94a3b8] text-center py-8">
          No per-user permissions set. Global Admins and Owners already have full access.
        </p>
      ) : (
        <div className="space-y-2">
          {permissions.map((perm: ServerPermission) => {
            const roleStyle = ROLE_COLORS[perm.role] || ROLE_COLORS.VIEWER;
            return (
              <div key={perm.id} className="flex items-center justify-between p-3.5 rounded-xl"
                style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-[#e2e8f0]"
                    style={{ background: "#1a1f2e" }}>
                    {perm.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <span className="text-sm font-semibold text-[#e2e8f0]">
                    {perm.username || `User #${perm.user_id}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={perm.role}
                    onChange={(e) => updateMutation.mutate({ userId: perm.user_id, role: e.target.value })}
                    className="rounded-lg px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none"
                    style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {SERVER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: roleStyle.bg, color: roleStyle.text }}>
                    {perm.role}
                  </span>
                  <button
                    onClick={() => revokeMutation.mutate(perm.user_id)}
                    disabled={revokeMutation.isPending}
                    className="p-1.5 rounded-md text-[#64748b] hover:text-[#ff4757] transition-all duration-150"
                    style={{ background: "transparent" }}
                    title="Revoke access"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
