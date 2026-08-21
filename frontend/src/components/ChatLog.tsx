import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Bot } from "lucide-react";
import { chatApi } from "../api/chat";

interface ChatLogProps {
  serverId: number;
}

export default function ChatLog({ serverId }: ChatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["server-chat", serverId],
    queryFn: () => chatApi.getServerChat(serverId),
    refetchInterval: 30000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-xl flex items-center justify-center h-64" style={{
        background: "#0e0c09",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="text-center">
          <MessageSquare className="h-8 w-8 text-[#12100b] mx-auto mb-3" />
          <p className="text-sm text-[#8a8271]">No chat messages</p>
          <p className="text-xs text-[#6b6455] mt-1">Messages will appear here in real-time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl flex flex-col" style={{
      height: "28rem",
      background: "#0e0c09",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <MessageSquare className="h-4 w-4 text-[#6b6455]" />
        <span className="text-xs font-bold text-[#e8e3d8] uppercase tracking-wider">
          Server Chat
        </span>
        <span className="text-xs text-[#6b6455]">&middot; {messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.is_system ? "opacity-70" : ""}`}
          >
            {msg.is_system ? (
              <Bot className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e3b454" }} />
            ) : (
              <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "#12100b" }}>
                <span className="text-[10px] font-bold text-[#e8e3d8]">
                  {msg.player_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold" style={{ color: msg.is_system ? "#e3b454" : "#e8e3d8" }}>
                  {msg.is_system ? "System" : msg.player_name}
                </span>
                <span className="text-[10px] text-[#6b6455]" style={{ fontFamily: "var(--font-mono)" }}>
                  {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${
                msg.is_system ? "text-[#e3b454]/70 italic" : "text-[#8a8271]"
              }`}>
                {msg.message}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
