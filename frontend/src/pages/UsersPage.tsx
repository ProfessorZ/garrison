import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, ChevronDown } from "lucide-react";
import { usersApi } from "../api/users";
import { useAuth } from "../contexts/AuthContext";
import type { User, UserRole } from "../types";

const ROLES: UserRole[] = ["OWNER", "ADMIN", "MODERATOR", "VIEWER"];

const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: "text-amber-400 bg-amber-500/10",
  ADMIN: "text-red-400 bg-red-500/10",
  MODERATOR: "text-blue-400 bg-blue-500/10",
  VIEWER: "text-slate-400 bg-slate-500/10",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-5 w-5 text-emerald-400" />
        <h2 className="text-xl font-semibold text-slate-100">User Management</h2>
        <span className="text-sm text-slate-500">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Created
              </th>
              {isOwner && (
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {users.map((u: User) => (
              <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{u.username}</p>
                      {u.id === currentUser?.id && (
                        <p className="text-[10px] text-slate-500">You</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role]}`}
                  >
                    <Shield className="h-3 w-3" />
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
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
                          className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          Change Role
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        {editingUserId === u.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 py-1">
                            {ROLES.filter((r) => r !== "OWNER").map((role) => (
                              <button
                                key={role}
                                onClick={() =>
                                  roleMutation.mutate({
                                    userId: u.id,
                                    role,
                                  })
                                }
                                disabled={roleMutation.isPending}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-600 transition-colors ${
                                  u.role === role
                                    ? "text-emerald-400 font-semibold"
                                    : "text-slate-300"
                                }`}
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
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            No users found.
          </div>
        )}
      </div>

      {roleMutation.isError && (
        <p className="mt-3 text-sm text-red-400">
          Failed to update role. {(roleMutation.error as Error)?.message}
        </p>
      )}
    </div>
  );
}
