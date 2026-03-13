import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link2, Unlink, HelpCircle } from "lucide-react";
import { authApi } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

export default function DiscordLinkCard() {
  const { user, login: _login } = useAuth();
  const [discordId, setDiscordId] = useState("");
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [linkedId, setLinkedId] = useState<string | null | undefined>(
    user?.discord_id
  );

  const linkMutation = useMutation({
    mutationFn: (id: string) => authApi.linkDiscord(id),
    onSuccess: (data) => {
      setLinkedId(data.discord_id);
      setDiscordId("");
      setError("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to link Discord account");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => authApi.unlinkDiscord(),
    onSuccess: () => {
      setLinkedId(null);
      setError("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to unlink Discord account");
    },
  });

  const isLinked = !!linkedId;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-4 w-4 text-[#5865F2]" />
        <h3 className="text-sm font-bold text-[#e2e8f0]">
          Link Discord Account
        </h3>
      </div>

      {isLinked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "rgba(88,101,242,0.12)",
                color: "#5865F2",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "#5865F2" }}
              />
              Linked
            </span>
            <span className="text-xs text-[#94a3b8] font-mono">
              {linkedId}
            </span>
          </div>
          <p className="text-xs text-[#64748b]">
            Your Discord account is linked. You can use bot slash commands based
            on your Garrison role ({user?.role}).
          </p>
          <button
            onClick={() => unlinkMutation.mutate()}
            disabled={unlinkMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#ff4757] transition-all duration-150"
            style={{
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.15)",
            }}
          >
            <Unlink className="h-3 w-3" />
            {unlinkMutation.isPending ? "Unlinking..." : "Unlink Discord"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#94a3b8]">
            Link your Discord account to use bot slash commands like{" "}
            <code className="text-[#00d4aa]">/players</code>,{" "}
            <code className="text-[#00d4aa]">/kick</code>,{" "}
            <code className="text-[#00d4aa]">/ban</code>, and{" "}
            <code className="text-[#00d4aa]">/rcon</code> from Discord.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="Your Discord User ID"
              className="flex-1 rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#5865F2]"
              style={{
                background: "#0d1117",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <button
              onClick={() => linkMutation.mutate(discordId)}
              disabled={!discordId.trim() || linkMutation.isPending}
              className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all duration-150 disabled:opacity-40"
              style={{ background: "#5865F2" }}
            >
              {linkMutation.isPending ? "Linking..." : "Link"}
            </button>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="inline-flex items-center gap-1 text-[10px] text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            <HelpCircle className="h-3 w-3" />
            How to find your Discord User ID
          </button>
          {showHelp && (
            <div
              className="rounded-lg p-3 text-[11px] text-[#94a3b8] space-y-1"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p>1. Open Discord Settings &gt; Advanced</p>
              <p>2. Enable <strong>Developer Mode</strong></p>
              <p>3. Right-click your username or avatar</p>
              <p>4. Click <strong>Copy User ID</strong></p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#ff4757]">{error}</p>}
    </div>
  );
}
