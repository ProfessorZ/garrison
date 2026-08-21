import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serversApi } from "../api/servers";
import { pluginsApi } from "../api/plugins";
import { gameIcon, gameLabel } from "../lib/gameMeta";

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
    query_port: "",
    rcon_port: "",
    rcon_password: "",
    game_type: "",
  });

  const { data: pluginData } = useQuery({
    queryKey: ["plugins"],
    queryFn: pluginsApi.list,
    staleTime: 60_000,
  });
  const plugins: PluginInfo[] = (pluginData?.plugins ?? []) as PluginInfo[];

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
  }, [plugins, form.game_type]);

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
      query_port: "",
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
    const queryPort = form.query_port ? parseInt(form.query_port) : null;

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
    if (queryPort !== null && (isNaN(queryPort) || queryPort < 1 || queryPort > 65535)) {
      setError("Query port must be between 1 and 65535");
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
    if (!form.game_type) {
      setError("Please select a game type");
      return;
    }

    createServer.mutate({
      name: form.name.trim(),
      host: form.host.trim(),
      port,
      query_port: queryPort,
      rcon_port: rconPort,
      rcon_password: form.rcon_password,
      game_type: form.game_type,
    });
  };

  if (!open) return null;

  const field = {
    background: "var(--bg-deepest)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(5,4,3,0.75)", backdropFilter: "blur(3px)" }}
        onClick={handleClose}
      />
      <div
        className="relative w-full max-w-[520px] mx-4 animate-fade-in overflow-hidden max-h-[95vh] overflow-y-auto"
        style={{
          border: "1px solid var(--border-accent)",
          borderRadius: 10,
          background: "var(--bg-card)",
        }}
      >
        <div
          className="flex items-center justify-between px-[18px] py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="font-mono text-[11px] tracking-widest" style={{ color: "var(--accent)" }}>
            ADD SERVER
          </span>
          <button
            onClick={handleClose}
            className="font-mono text-xs touch-compact"
            style={{ color: "var(--text-muted)", minHeight: "unset" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <p
              className="font-mono text-xs px-3 py-2.5 rounded mb-4"
              style={{ color: "var(--danger)", background: "rgba(217,107,92,0.1)" }}
            >
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="label-caps block mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Game Server"
                className="w-full px-3 py-2 text-[12.5px]"
                style={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps block mb-1.5">Host</label>
              <input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="192.168.1.100 or host.example.com"
                className="w-full px-3 py-2 text-[12.5px]"
                style={field}
              />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Game Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                className="w-full px-3 py-2 text-[12.5px]"
                style={field}
              />
            </div>
            <div>
              <label className="label-caps block mb-1.5">RCON Port</label>
              <input
                type="number"
                value={form.rcon_port}
                onChange={(e) => setForm({ ...form, rcon_port: e.target.value })}
                className="w-full px-3 py-2 text-[12.5px]"
                style={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps block mb-1.5">Query Port (optional)</label>
              <input
                type="number"
                value={form.query_port}
                onChange={(e) => setForm({ ...form, query_port: e.target.value })}
                placeholder="leave blank if same as game"
                className="w-full px-3 py-2 text-[12.5px]"
                style={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps block mb-1.5">RCON Passphrase</label>
              <input
                type="password"
                value={form.rcon_password}
                onChange={(e) => setForm({ ...form, rcon_password: e.target.value })}
                placeholder="stored encrypted"
                className="w-full px-3 py-2 text-[12.5px]"
                style={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps block mb-1.5">Plugin</label>
              {plugins.length === 0 ? (
                <p className="font-mono text-xs py-2" style={{ color: "var(--text-muted)" }}>
                  no plugins installed — install from System
                </p>
              ) : (
                <select
                  value={form.game_type}
                  onChange={(e) => handleGameTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-[12.5px]"
                  style={field}
                >
                  {plugins.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon || gameIcon(p.id)} {p.display_name || gameLabel(p.id)}
                      {p.default_ports?.game != null
                        ? ` — ports ${p.default_ports.game}/${p.default_ports.rcon ?? "?"}`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div
            className="flex justify-end gap-2.5 mt-5 pt-3.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button type="button" onClick={handleClose} className="btn-ghost">
              CANCEL
            </button>
            <button
              type="submit"
              disabled={createServer.isPending || plugins.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {createServer.isPending ? "ADDING…" : "ADD + PROBE RCON"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
