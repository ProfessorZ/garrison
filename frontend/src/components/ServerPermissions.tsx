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

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-red-400 bg-red-500/10",
  MODERATOR: "text-blue-400 bg-blue-500/10",
  VIEWER: "text-slate-400 bg-slate-500/10",
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

  // Filter users not yet in the permission list and matching search
  const availableUsers = allUsers.filter((u: User) => {
    if (permissions.some((p: ServerPermission) => p.user_id === u.id)) return false;
    // Don't show global ADMIN/OWNER — they already have access
    if (u.role === "OWNER" || u.role === "ADMIN") return false;
    if (searchQuery) {
      return u.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const grantMutation = useMutation({
    mutationFn: () =>
      permissionsApi.grant(serverId, selectedUserId!, selectedRole),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["server-permissions", serverId],
      });
      setShowAdd(false);
      setSelectedUserId(null);
      setSearchQuery("");
      setSelectedRole("VIEWER");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) => permissionsApi.revoke(serverId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["server-permissions", serverId],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      permissionsApi.grant(serverId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["server-permissions", serverId],
      });
    },
  });

  const inputClass =
    "w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          Server Access
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedUserId(null);
              }}
              placeholder="Search users..."
              className={`${inputClass} pl-9`}
            />
          </div>

          {searchQuery && availableUsers.length > 0 && !selectedUserId && (
            <div className="bg-slate-700 rounded-md border border-slate-600 max-h-32 overflow-y-auto">
              {availableUsers.map((u: User) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setSearchQuery(u.username);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  {u.username}
                  <span className="text-xs text-slate-500 ml-2">{u.role}</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && availableUsers.length === 0 && !selectedUserId && (
            <p className="text-xs text-slate-500">No matching users available.</p>
          )}

          <div className="flex items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={inputClass}
            >
              {SERVER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={() => grantMutation.mutate()}
              disabled={!selectedUserId || grantMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors shrink-0"
            >
              {grantMutation.isPending ? "Granting..." : "Grant Access"}
            </button>
          </div>

          {grantMutation.isError && (
            <p className="text-xs text-red-400">Failed to grant access.</p>
          )}
        </div>
      )}

      {/* Permissions list */}
      {permissions.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          No per-user permissions set. Global Admins and Owners already have full
          access.
        </p>
      ) : (
        <div className="space-y-2">
          {permissions.map((perm: ServerPermission) => (
            <div
              key={perm.id}
              className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                  {perm.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <span className="text-sm font-medium text-slate-200">
                  {perm.username || `User #${perm.user_id}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={perm.role}
                  onChange={(e) =>
                    updateMutation.mutate({
                      userId: perm.user_id,
                      role: e.target.value,
                    })
                  }
                  className="rounded-md bg-slate-700 border border-slate-600 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  {SERVER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    ROLE_COLORS[perm.role] || ROLE_COLORS.VIEWER
                  }`}
                >
                  {perm.role}
                </span>
                <button
                  onClick={() => revokeMutation.mutate(perm.user_id)}
                  disabled={revokeMutation.isPending}
                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Revoke access"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
