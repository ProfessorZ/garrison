import { useQuery } from "@tanstack/react-query";
import { Bot, Wifi, WifiOff } from "lucide-react";
import { discordApi } from "../api/discord";

export default function DiscordBotStatus() {
  const { data: bot, isLoading } = useQuery({
    queryKey: ["discord-bot-status"],
    queryFn: discordApi.getBotStatus,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg p-3" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <Bot className="h-3.5 w-3.5" />
          <span>Checking bot status...</span>
        </div>
      </div>
    );
  }

  if (!bot) return null;

  return (
    <div className="rounded-lg p-3" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <Bot className="h-3.5 w-3.5 text-[#94a3b8]" />
        <span className="text-xs font-semibold text-[#e2e8f0]">Discord Bot</span>
      </div>
      <div className="flex items-center gap-2">
        {bot.connected ? (
          <>
            <Wifi className="h-3 w-3 text-[#00d4aa]" />
            <span className="text-xs text-[#00d4aa] font-medium">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-[#64748b]" />
            <span className="text-xs text-[#64748b] font-medium">
              {bot.bot_username === null ? "Not configured" : "Disconnected"}
            </span>
          </>
        )}
      </div>
      {bot.connected && (
        <div className="mt-1.5 space-y-0.5">
          {bot.guild_name && (
            <p className="text-[11px] text-[#64748b]">
              Guild: <span className="text-[#94a3b8]">{bot.guild_name}</span>
            </p>
          )}
          {bot.bot_username && (
            <p className="text-[11px] text-[#64748b]">
              Bot: <span className="text-[#94a3b8]">{bot.bot_username}</span>
            </p>
          )}
          <p className="text-[11px] text-[#64748b]">
            Commands: <span className="text-[#94a3b8]">{bot.command_count}</span>
          </p>
        </div>
      )}
    </div>
  );
}
