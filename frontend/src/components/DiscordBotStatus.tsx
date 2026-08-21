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
        <div className="flex items-center gap-2 text-xs text-[#6b6455]">
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
        <Bot className="h-3.5 w-3.5 text-[#8a8271]" />
        <span className="text-xs font-semibold text-[#e8e3d8]">Discord Bot</span>
      </div>
      <div className="flex items-center gap-2">
        {bot.connected ? (
          <>
            <Wifi className="h-3 w-3 text-[#ffb224]" />
            <span className="text-xs text-[#ffb224] font-medium">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-[#6b6455]" />
            <span className="text-xs text-[#6b6455] font-medium">
              {bot.bot_username === null ? "Not configured" : "Disconnected"}
            </span>
          </>
        )}
      </div>
      {bot.connected && (
        <div className="mt-1.5 space-y-0.5">
          {bot.guild_name && (
            <p className="text-[11px] text-[#6b6455]">
              Guild: <span className="text-[#8a8271]">{bot.guild_name}</span>
            </p>
          )}
          {bot.bot_username && (
            <p className="text-[11px] text-[#6b6455]">
              Bot: <span className="text-[#8a8271]">{bot.bot_username}</span>
            </p>
          )}
          <p className="text-[11px] text-[#6b6455]">
            Commands: <span className="text-[#8a8271]">{bot.command_count}</span>
          </p>
        </div>
      )}
    </div>
  );
}
