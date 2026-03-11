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
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center h-64">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No chat messages</p>
          <p className="text-xs text-slate-600 mt-1">
            Messages will appear here in real-time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg flex flex-col" style={{ height: "28rem" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700">
        <MessageSquare className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-400">
          Server Chat
        </span>
        <span className="text-xs text-slate-600">
          &middot; {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${
              msg.is_system ? "opacity-70" : ""
            }`}
          >
            {msg.is_system ? (
              <Bot className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-slate-300">
                  {msg.player_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xs font-semibold ${
                    msg.is_system ? "text-amber-400" : "text-slate-200"
                  }`}
                >
                  {msg.is_system ? "System" : msg.player_name}
                </span>
                <span className="text-[10px] text-slate-600">
                  {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <p
                className={`text-sm leading-relaxed ${
                  msg.is_system
                    ? "text-amber-200/80 italic"
                    : "text-slate-300"
                }`}
              >
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
