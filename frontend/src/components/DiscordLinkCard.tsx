import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link2, Unlink, HelpCircle, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { authApi } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

export default function DiscordLinkCard() {
  const { user } = useAuth();
  const [discordId, setDiscordId] = useState("");
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [linkedId, setLinkedId] = useState<string | null | undefined>(
    user?.discord_id
  );
  const [linkedUsername, setLinkedUsername] = useState<string | null | undefined>(
    user?.discord_username
  );
  const [linkedAvatar, setLinkedAvatar] = useState<string | null | undefined>(
    user?.discord_avatar
  );

  const { data: oauthStatus } = useQuery({
    queryKey: ["discord-oauth-enabled"],
    queryFn: () => authApi.getDiscordOAuthEnabled(),
    staleTime: 60_000,
  });

  const oauthEnabled = oauthStatus?.enabled ?? false;

  // Check URL params for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordResult = params.get("discord");
    if (discordResult === "success") {
      setSuccessMsg("Discord account linked successfully!");
      // Refresh user data to get updated discord info
      authApi.getMe().then((me) => {
        setLinkedId(me.discord_id);
        setLinkedUsername(me.discord_username);
        setLinkedAvatar(me.discord_avatar);
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (discordResult === "error") {
      const reason = params.get("reason") || "unknown";
      const messages: Record<string, string> = {
        already_linked: "This Discord account is already linked to another Garrison user",
        token_exchange_failed: "Failed to verify with Discord — please try again",
        user_fetch_failed: "Could not fetch your Discord profile — please try again",
        invalid_state: "Security validation failed — please try again",
        access_denied: "Discord authorization was cancelled",
      };
      setError(messages[reason] || `Discord linking failed (${reason})`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const linkMutation = useMutation({
    mutationFn: (id: string) => authApi.linkDiscord(id),
    onSuccess: (data) => {
      setLinkedId(data.discord_id);
      setLinkedUsername(data.discord_username);
      setLinkedAvatar(data.discord_avatar);
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
      setLinkedUsername(null);
      setLinkedAvatar(null);
      setError("");
      setSuccessMsg("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to unlink Discord account");
    },
  });

  const handleOAuthLink = async () => {
    try {
      setError("");
      const { url } = await authApi.getDiscordAuthorizeUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start Discord authorization");
    }
  };

  const isLinked = !!linkedId;

  const avatarUrl = linkedAvatar && linkedId
    ? `https://cdn.discordapp.com/avatars/${linkedId}/${linkedAvatar}.png?size=64`
    : null;

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

      {successMsg && (
        <div
          className="rounded-lg px-3 py-2 mb-3 text-xs text-[#00d4aa]"
          style={{ background: "rgba(0,212,170,0.08)" }}
        >
          {successMsg}
        </div>
      )}

      {isLinked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Discord avatar"
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "#5865F2", color: "#fff" }}
              >
                {(linkedUsername || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
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
                {linkedUsername && (
                  <span className="text-xs text-[#e2e8f0] font-medium">
                    {linkedUsername}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#64748b] font-mono mt-0.5 block">
                {linkedId}
              </span>
            </div>
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

          {oauthEnabled && (
            <button
              onClick={handleOAuthLink}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90"
              style={{ background: "#5865F2" }}
            >
              <ExternalLink className="h-4 w-4" />
              Link with Discord
            </button>
          )}

          {oauthEnabled ? (
            <button
              onClick={() => setShowManual(!showManual)}
              className="inline-flex items-center gap-1 text-[11px] text-[#64748b] hover:text-[#94a3b8] transition-colors"
            >
              {showManual ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Or link manually with Discord ID
            </button>
          ) : null}

          {(!oauthEnabled || showManual) && (
            <div className="space-y-2">
              {oauthEnabled && (
                <div
                  className="h-px w-full"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              )}
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
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#ff4757]">{error}</p>}
    </div>
  );
}
