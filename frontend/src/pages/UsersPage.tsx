import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, ChevronDown } from "lucide-react";
import { usersApi } from "../api/users";
import { useAuth } from "../contexts/AuthContext";
import type { User, UserRole } from "../types";

const ROLES: UserRole[] = ["OWNER", "ADMIN", "MODERATOR", "VIEWER"];

const ROLE_COLORS: Record<UserRole, { text: string; bg: string }> = {
  OWNER: { text: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
  ADMIN: { text: "#ff4757", bg: "rgba(255,71,87,0.08)" },
  MODERATOR: { text: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  VIEWER: { text: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      usersApi.setRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUserId(null);
    },
  });

  const isOwner = currentUser?.role === "OWNER";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Users className="h-5 w-5 text-[#00d4aa]" />
        <h2 className="text-2xl font-bold text-[#e2e8f0]">User Management</h2>
        <span className="text-sm text-[#64748b] font-medium">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">User</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Role</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Created</th>
              {isOwner && (
                <th className="text-right px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((u: User) => {
              const roleStyle = ROLE_COLORS[u.role];
              return (
                <tr key={u.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-[#e2e8f0]"
                        style={{ background: "#1a1f2e" }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#e2e8f0]">{u.username}</p>
                        {u.id === currentUser?.id && (
                          <p className="text-[10px] text-[#64748b]">You</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                      style={{ background: roleStyle.bg, color: roleStyle.text }}
                    >
                      <Shield className="h-3 w-3" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#94a3b8]">{formatDate(u.created_at)}</td>
                  {isOwner && (
                    <td className="px-5 py-3.5 text-right">
                      {u.id !== currentUser?.id && (
                        <div className="relative inline-block">
                          <button
                            onClick={() => setEditingUserId(editingUserId === u.id ? null : u.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
                            style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            Change Role <ChevronDown className="h-3 w-3" />
                          </button>
                          {editingUserId === u.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-2xl z-20 py-1"
                              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}>
                              {ROLES.filter((r) => r !== "OWNER").map((role) => (
                                <button
                                  key={role}
                                  onClick={() => roleMutation.mutate({ userId: u.id, role })}
                                  disabled={roleMutation.isPending}
                                  className="w-full text-left px-3 py-2 text-xs transition-colors"
                                  style={{
                                    background: "transparent",
                                    color: u.role === role ? "#00d4aa" : "#e2e8f0",
                                    fontWeight: u.role === role ? 700 : 400,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  {role}
                                  {u.role === role && " (current)"}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-[#94a3b8] text-sm">No users found.</div>
        )}
      </div>

      {roleMutation.isError && (
        <p className="mt-3 text-sm text-[#ff4757]">
          Failed to update role. {(roleMutation.error as Error)?.message}
        </p>
      )}
    </div>
  );
}
