import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ChevronDown } from "lucide-react";
import { usersApi } from "../api/users";
import { useAuth } from "../contexts/AuthContext";
import type { User, UserRole } from "../types";

const ROLES: UserRole[] = ["OWNER", "ADMIN", "MODERATOR", "VIEWER"];

const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: "#e3b454",
  ADMIN: "#d96b5c",
  MODERATOR: "#67b7e2",
  VIEWER: "#8a8271",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UsersPanel({ compact = false }: { compact?: boolean }) {
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
      <div className="flex items-center justify-center h-40">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <p className="font-mono text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
          {users.length} operator{users.length !== 1 ? "s" : ""} · role changes require OWNER
        </p>
      )}

      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--bg-deepest)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["OPERATOR", "ROLE", "SINCE", ...(isOwner ? ["ACTIONS"] : [])].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 font-mono text-[9.5px] tracking-widest ${
                      h === "ACTIONS" ? "text-right" : "text-left"
                    }`}
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: User) => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded flex items-center justify-center font-mono text-[10px] font-semibold"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                      >
                        {u.username.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {u.username}
                        </p>
                        {u.id === currentUser?.id && (
                          <p className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
                            (you)
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        color: ROLE_COLORS[u.role],
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <Shield className="h-3 w-3" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(u.created_at)}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      {u.id !== currentUser?.id && (
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setEditingUserId(editingUserId === u.id ? null : u.id)
                            }
                            className="font-mono text-[9.5px] px-2.5 py-1 touch-compact inline-flex items-center gap-1"
                            style={{
                              color: "var(--text-secondary)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 4,
                              minHeight: "unset",
                            }}
                          >
                            CHANGE ROLE <ChevronDown className="h-3 w-3" />
                          </button>
                          {editingUserId === u.id && (
                            <div
                              className="absolute right-0 mt-1 w-36 rounded-lg py-1 z-20"
                              style={{
                                background: "var(--bg-elevated)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                              }}
                            >
                              {ROLES.filter((r) => r !== "OWNER").map((role) => (
                                <button
                                  key={role}
                                  onClick={() =>
                                    roleMutation.mutate({ userId: u.id, role })
                                  }
                                  disabled={roleMutation.isPending}
                                  className="w-full text-left px-3 py-2 font-mono text-[10px] touch-compact"
                                  style={{
                                    color: u.role === role ? "var(--accent)" : "var(--text-primary)",
                                    minHeight: "unset",
                                  }}
                                >
                                  {role}
                                  {u.role === role ? " ✓" : ""}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-10 font-mono text-sm" style={{ color: "var(--text-muted)" }}>
            no operators
          </div>
        )}
      </div>

      {roleMutation.isError && (
        <p className="mt-3 font-mono text-xs" style={{ color: "var(--danger)" }}>
          {(roleMutation.error as Error)?.message || "Failed to update role"}
        </p>
      )}
    </div>
  );
}
