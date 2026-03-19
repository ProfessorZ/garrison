import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, AlertCircle } from "lucide-react";
import { serversApi } from "../api/servers";
import client from "../api/client";

interface AddServerModalProps {
  open: boolean;
  onClose: () => void;
}

interface PluginInfo {
  id: string;
  name: string;
  display_name: string;
  version: string;
  description: string;
  icon: string;
  default_ports: { game?: number; rcon?: number };
}

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
    game_type: "",
  });

  // Fetch installed plugins from the API
  const { data: plugins = [] } = useQuery<PluginInfo[]>({
    queryKey: ["plugins"],
    queryFn: async () => {
      const res = await client.get<PluginInfo[]>("/plugins/");
      return res.data;
    },
    staleTime: 60_000,
  });

  // Set default game_type when plugins load
  useEffect(() => {
    if (plugins.length > 0 && !form.game_type) {
      const first = plugins[0];
      setForm((f) => ({
        ...f,
        game_type: first.id,
        port: first.default_ports?.game?.toString() ?? "",
        rcon_port: first.default_ports?.rcon?.toString() ?? "",
      }));
    }
  }, [plugins]);

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
    const first = plugins[0];
    setForm({
      name: "",
      host: "",
      port: first?.default_ports?.game?.toString() ?? "",
      rcon_port: first?.default_ports?.rcon?.toString() ?? "",
      rcon_password: "",
      game_type: first?.id ?? "",
    });
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGameTypeChange = (gameType: string) => {
    const plugin = plugins.find((p) => p.id === gameType);
    setForm({
      ...form,
      game_type: gameType,
      port: plugin?.default_ports?.game?.toString() ?? form.port,
      rcon_port: plugin?.default_ports?.rcon?.toString() ?? form.rcon_port,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const port = parseInt(form.port);
    const rconPort = parseInt(form.rcon_port);

    if (!form.name.trim()) { setError("Server name is required"); return; }
    if (!form.host.trim()) { setError("Host address is required"); return; }
    if (isNaN(port) || port < 1 || port > 65535) { setError("Game port must be between 1 and 65535"); return; }
    if (isNaN(rconPort) || rconPort < 1 || rconPort > 65535) { setError("RCON port must be between 1 and 65535"); return; }
    if (!form.rcon_password) { setError("RCON password is required"); return; }
    if (!form.game_type) { setError("Please select a game type"); return; }

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

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle = {
    background: "#1a1f2e",
    border: "1px solid rgba(255,255,255,0.06)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative shadow-2xl w-full max-w-lg animate-fade-in mx-0 sm:mx-4 rounded-none sm:rounded-xl h-full sm:h-auto overflow-y-auto sm:overflow-visible"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <Plus className="h-4 w-4 text-[#00d4aa]" />
            <h2 className="text-base font-bold text-[#e2e8f0]">Add Server</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-[#64748b] hover:text-[#e2e8f0] transition-colors"
            style={{ background: "transparent" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="flex items-center gap-2.5 mb-5 rounded-lg px-3.5 py-3 animate-fade-in"
              style={{ background: "rgba(255,71,87,0.06)", border: "1px solid rgba(255,71,87,0.12)" }}>
              <AlertCircle className="h-4 w-4 text-[#ff4757] shrink-0" />
              <p className="text-sm text-[#ff4757]">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                Server Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="My Game Server"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                Host
              </label>
              <input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="192.168.1.100 or my-server.example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                Game Port
              </label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="16261"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                RCON Port
              </label>
              <input
                type="number"
                value={form.rcon_port}
                onChange={(e) => setForm({ ...form, rcon_port: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="27015"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                RCON Password
              </label>
              <input
                type="password"
                value={form.rcon_password}
                onChange={(e) => setForm({ ...form, rcon_password: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="Enter RCON password"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                Game Type
              </label>
              {plugins.length === 0 ? (
                <div className="text-sm text-[#64748b] py-2.5">No plugins installed</div>
              ) : (
                <select
                  value={form.game_type}
                  onChange={(e) => handleGameTypeChange(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  {plugins.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#e2e8f0] transition-all duration-150"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createServer.isPending || plugins.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
              style={{ background: "#00d4aa" }}
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
