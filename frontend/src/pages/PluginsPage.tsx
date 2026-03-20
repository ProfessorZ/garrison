import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Puzzle,
  AlertTriangle,
  Upload,
  GitBranch,
  Trash2,
  RefreshCw,
  ExternalLink,
  X,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import { pluginsApi } from "../api/plugins";
import type { Plugin } from "../api/plugins";

export default function PluginsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"git" | "zip">("git");
  const [gitUrl, setGitUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const [successPlugin, setSuccessPlugin] = useState<Plugin | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: pluginData, isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: pluginsApi.list,
  });
  const plugins = pluginData?.plugins ?? [];
  const loadErrors = pluginData?.errors ?? {};

  const gitInstall = useMutation({
    mutationFn: (url: string) => pluginsApi.installFromGit(url),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      setGitUrl("");
      setRiskAcknowledged(false);
      setSuccessPlugin(data.plugin);
    },
  });

  const zipInstall = useMutation({
    mutationFn: (file: File) => pluginsApi.installFromZip(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      setZipFile(null);
      setRiskAcknowledged(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessPlugin(data.plugin);
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => pluginsApi.uninstall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      setConfirmUninstall(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => pluginsApi.update(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
    },
  });

  const isInstalling = gitInstall.isPending || zipInstall.isPending;
  const installError = gitInstall.error || zipInstall.error;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      setZipFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getErrorMessage = (error: unknown): string => {
    if (!error) return "";
    if (typeof error === "object" && error !== null && "response" in error) {
      const resp = (error as { response?: { data?: { detail?: string } } }).response;
      return resp?.data?.detail || "An unexpected error occurred";
    }
    if (error instanceof Error) return error.message;
    return "An unexpected error occurred";
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Puzzle className="h-6 w-6 text-[#00d4aa]" />
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Plugin Manager</h1>
        </div>
        <p className="text-[#94a3b8] text-sm">
          Install, update, and manage Garrison plugins to extend server functionality.
        </p>
      </div>

      {/* Security Warning Banner */}
      {!warningDismissed && (
        <div
          className="rounded-xl p-5 relative"
          style={{
            background: "rgba(251, 191, 36, 0.06)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
          }}
        >
          <button
            onClick={() => setWarningDismissed(true)}
            className="absolute top-3 right-3 text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2">
                Plugin Security Notice
              </h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">
                Garrison plugins are Python packages that run directly on your server
                with elevated access to your server database, RCON connections to your
                game servers, and the host filesystem (within Docker). Only install
                plugins from sources you trust. The Garrison project and its developers
                provide no warranty for third-party plugins and accept no liability for
                damages arising from their installation or use.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successPlugin && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(0, 212, 170, 0.06)",
            border: "1px solid rgba(0, 212, 170, 0.25)",
          }}
        >
          <CheckCircle className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#00d4aa]">
              Plugin installed successfully
            </p>
            <p className="text-[#94a3b8] text-sm mt-1">
              <strong className="text-[#e2e8f0]">{successPlugin.name}</strong>{" "}
              v{successPlugin.version} is now active. Garrison will use the new
              plugin immediately — a restart is not required.
            </p>
          </div>
          <button
            onClick={() => setSuccessPlugin(null)}
            className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Plugin Load Errors */}
      {Object.keys(loadErrors).length > 0 && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(251, 191, 36, 0.06)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
          }}
        >
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">
              Some plugins failed to load
            </p>
            <ul className="mt-2 space-y-1">
              {Object.entries(loadErrors).map(([name, error]) => (
                <li key={name} className="text-xs text-[#94a3b8]">
                  <span className="font-medium text-[#e2e8f0]">{name}</span>: {error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Installed Plugins */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-[#94a3b8]" />
          Installed Plugins
        </h2>

        {isLoading ? (
          <p className="text-[#64748b] text-sm py-8 text-center">Loading plugins...</p>
        ) : plugins.length === 0 ? (
          <div className="text-center py-8">
            <Puzzle className="h-10 w-10 text-[#64748b] mx-auto mb-3 opacity-40" />
            <p className="text-[#64748b] text-sm">No plugins installed yet.</p>
            <p className="text-[#64748b] text-xs mt-1">
              Install your first plugin below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="rounded-lg p-4 flex items-center gap-4"
                style={{
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#1a1f2e" }}>
                  <Puzzle className="h-5 w-5 text-[#00d4aa]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#e2e8f0]">
                      {plugin.name}
                    </span>
                    <span className="text-xs text-[#64748b] font-mono">
                      v{plugin.version}
                    </span>
                    {plugin.status === "error" ? (
                      <span className="text-xs text-[#ff4757] flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Error
                      </span>
                    ) : (
                      <span className="text-xs text-[#00d4aa] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Loaded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5 truncate">
                    {plugin.description || "No description"}
                    {plugin.author && (
                      <span className="text-[#64748b]"> — {plugin.author}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {plugin.repo && (
                    <a
                      href={plugin.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-md text-[#64748b] hover:text-[#e2e8f0] transition-colors"
                      style={{ background: "#1a1f2e" }}
                      title="View repository"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {plugin.repo && (
                    <button
                      onClick={() => updateMutation.mutate(plugin.id)}
                      disabled={updateMutation.isPending}
                      className="p-2 rounded-md text-[#64748b] hover:text-[#00d4aa] transition-colors disabled:opacity-50"
                      style={{ background: "#1a1f2e" }}
                      title="Update plugin"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          updateMutation.isPending ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                  )}
                  {confirmUninstall === plugin.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#ff4757]">Remove?</span>
                      <button
                        onClick={() => uninstallMutation.mutate(plugin.id)}
                        disabled={uninstallMutation.isPending}
                        className="px-2 py-1 rounded text-xs font-medium text-white transition-colors disabled:opacity-50"
                        style={{ background: "#ff4757" }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmUninstall(null)}
                        className="px-2 py-1 rounded text-xs font-medium text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
                        style={{ background: "#1a1f2e" }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmUninstall(plugin.id)}
                      className="p-2 rounded-md text-[#64748b] hover:text-[#ff4757] transition-colors"
                      style={{ background: "#1a1f2e" }}
                      title="Uninstall plugin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Install Plugin */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-[#94a3b8]" />
          Install Plugin
        </h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: "#0d1117" }}>
          <button
            onClick={() => {
              setActiveTab("git");
              setRiskAcknowledged(false);
              gitInstall.reset();
              zipInstall.reset();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "git"
                ? "text-[#00d4aa]"
                : "text-[#64748b] hover:text-[#94a3b8]"
            }`}
            style={
              activeTab === "git"
                ? { background: "#1a1f2e" }
                : { background: "transparent" }
            }
          >
            <GitBranch className="h-4 w-4" />
            Install from Git URL
          </button>
          <button
            onClick={() => {
              setActiveTab("zip");
              setRiskAcknowledged(false);
              gitInstall.reset();
              zipInstall.reset();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "zip"
                ? "text-[#00d4aa]"
                : "text-[#64748b] hover:text-[#94a3b8]"
            }`}
            style={
              activeTab === "zip"
                ? { background: "#1a1f2e" }
                : { background: "transparent" }
            }
          >
            <Upload className="h-4 w-4" />
            Install from ZIP
          </button>
        </div>

        {/* Error display */}
        {installError && (
          <div
            className="rounded-lg p-3 mb-4 flex items-start gap-2"
            style={{
              background: "rgba(255, 71, 87, 0.08)",
              border: "1px solid rgba(255, 71, 87, 0.2)",
            }}
          >
            <XCircle className="h-4 w-4 text-[#ff4757] shrink-0 mt-0.5" />
            <p className="text-sm text-[#ff4757]">
              {getErrorMessage(installError)}
            </p>
          </div>
        )}

        {/* Git Tab */}
        {activeTab === "git" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                Git Repository URL
              </label>
              <input
                type="url"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/user/garrison-plugin-example.git"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] outline-none focus:ring-1 focus:ring-[#00d4aa] transition-all"
                style={{
                  background: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                disabled={isInstalling}
              />
            </div>

            {/* Risk acknowledgment */}
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(251, 191, 36, 0.04)",
                border: "1px solid rgba(251, 191, 36, 0.15)",
              }}
            >
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-3">
                Garrison plugins are Python packages that run directly on your server
                with elevated access to:
              </p>
              <ul className="text-xs text-[#94a3b8] space-y-1 mb-3 ml-2">
                <li>&#x2022; Your server database</li>
                <li>&#x2022; RCON connections to your game servers</li>
                <li>&#x2022; The host filesystem (within Docker)</li>
              </ul>
              <p className="text-xs text-[#94a3b8] mb-3">
                The Garrison project and its developers provide no warranty for
                third-party plugins and accept no liability for damages arising from
                their installation or use. By installing a plugin you confirm that you
                have reviewed its source code and accept sole responsibility for its
                effects.
              </p>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={riskAcknowledged}
                  onChange={(e) => setRiskAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded accent-[#00d4aa]"
                  disabled={isInstalling}
                />
                <span className="text-xs font-medium text-[#e2e8f0]">
                  I have read and understood the above. I accept full responsibility.
                </span>
              </label>
            </div>

            <button
              onClick={() => gitInstall.mutate(gitUrl)}
              disabled={!gitUrl.trim() || !riskAcknowledged || isInstalling}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: riskAcknowledged && gitUrl.trim() ? "#00d4aa" : "#1a1f2e",
                color: riskAcknowledged && gitUrl.trim() ? "#0a0e1a" : "#64748b",
              }}
            >
              {gitInstall.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  Install Plugin
                </>
              )}
            </button>
          </div>
        )}

        {/* ZIP Tab */}
        {activeTab === "zip" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                Plugin ZIP File
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-8 text-center cursor-pointer transition-all hover:border-[rgba(0,212,170,0.3)]"
                style={{
                  background: "#1a1f2e",
                  border: "2px dashed rgba(255,255,255,0.1)",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setZipFile(file);
                  }}
                  disabled={isInstalling}
                />
                {zipFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <Package className="h-6 w-6 text-[#00d4aa]" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-[#e2e8f0]">
                        {zipFile.name}
                      </p>
                      <p className="text-xs text-[#64748b]">
                        {formatSize(zipFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setZipFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="ml-2 p-1 rounded text-[#64748b] hover:text-[#ff4757] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-[#64748b] mx-auto mb-2" />
                    <p className="text-sm text-[#94a3b8]">
                      Drop a .zip file here or click to browse
                    </p>
                    <p className="text-xs text-[#64748b] mt-1">
                      ZIP must contain manifest.json and plugin.py
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Risk acknowledgment */}
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(251, 191, 36, 0.04)",
                border: "1px solid rgba(251, 191, 36, 0.15)",
              }}
            >
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-3">
                Garrison plugins are Python packages that run directly on your server
                with elevated access to:
              </p>
              <ul className="text-xs text-[#94a3b8] space-y-1 mb-3 ml-2">
                <li>&#x2022; Your server database</li>
                <li>&#x2022; RCON connections to your game servers</li>
                <li>&#x2022; The host filesystem (within Docker)</li>
              </ul>
              <p className="text-xs text-[#94a3b8] mb-3">
                The Garrison project and its developers provide no warranty for
                third-party plugins and accept no liability for damages arising from
                their installation or use. By installing a plugin you confirm that you
                have reviewed its source code and accept sole responsibility for its
                effects.
              </p>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={riskAcknowledged}
                  onChange={(e) => setRiskAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded accent-[#00d4aa]"
                  disabled={isInstalling}
                />
                <span className="text-xs font-medium text-[#e2e8f0]">
                  I have read and understood the above. I accept full responsibility.
                </span>
              </label>
            </div>

            <button
              onClick={() => zipFile && zipInstall.mutate(zipFile)}
              disabled={!zipFile || !riskAcknowledged || isInstalling}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: riskAcknowledged && zipFile ? "#00d4aa" : "#1a1f2e",
                color: riskAcknowledged && zipFile ? "#0a0e1a" : "#64748b",
              }}
            >
              {zipInstall.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Install Plugin
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
