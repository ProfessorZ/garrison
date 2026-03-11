import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, AlertCircle } from "lucide-react";
import { serversApi } from "../api/servers";

interface AddServerModalProps {
  open: boolean;
  onClose: () => void;
}

const GAME_TYPES = [
  { value: "zomboid", label: "Project Zomboid" },
  { value: "minecraft", label: "Minecraft" },
  { value: "valheim", label: "Valheim" },
  { value: "ark", label: "ARK: Survival" },
  { value: "rust", label: "Rust" },
  { value: "csgo", label: "CS2 / CS:GO" },
  { value: "other", label: "Other" },
];

export default function AddServerModal({ open, onClose }: AddServerModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    host: "",
    port: "",
    rcon_port: "",
    rcon_password: "",
    game_type: "zomboid",
  });

  const createServer = useMutation({
    mutationFn: serversApi.create,
    onSuccess: (server) => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      resetForm();
      onClose();
      navigate(`/server/${server.id}`);
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to add server");
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      host: "",
      port: "",
      rcon_port: "",
      rcon_password: "",
      game_type: "zomboid",
    });
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const port = parseInt(form.port);
    const rconPort = parseInt(form.rcon_port);

    if (!form.name.trim()) {
      setError("Server name is required");
      return;
    }
    if (!form.host.trim()) {
      setError("Host address is required");
      return;
    }
    if (isNaN(port) || port < 1 || port > 65535) {
      setError("Game port must be between 1 and 65535");
      return;
    }
    if (isNaN(rconPort) || rconPort < 1 || rconPort > 65535) {
      setError("RCON port must be between 1 and 65535");
      return;
    }
    if (!form.rcon_password) {
      setError("RCON password is required");
      return;
    }

    createServer.mutate({
      name: form.name.trim(),
      host: form.host.trim(),
      port,
      rcon_port: rconPort,
      rcon_password: form.rcon_password,
      game_type: form.game_type,
    });
  };

  if (!open) return null;

  const inputClass =
    "w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-100">
              Add Server
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="flex items-center gap-2 mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Server Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="My Game Server"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Host
              </label>
              <input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className={inputClass}
                placeholder="192.168.1.100 or my-server.example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Game Port
              </label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                className={inputClass}
                placeholder="16261"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                RCON Port
              </label>
              <input
                type="number"
                value={form.rcon_port}
                onChange={(e) =>
                  setForm({ ...form, rcon_port: e.target.value })
                }
                className={inputClass}
                placeholder="27015"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                RCON Password
              </label>
              <input
                type="password"
                value={form.rcon_password}
                onChange={(e) =>
                  setForm({ ...form, rcon_password: e.target.value })
                }
                className={inputClass}
                placeholder="Enter RCON password"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Game Type
              </label>
              <select
                value={form.game_type}
                onChange={(e) =>
                  setForm({ ...form, game_type: e.target.value })
                }
                className={inputClass}
              >
                {GAME_TYPES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createServer.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {createServer.isPending ? "Adding..." : "Add Server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
