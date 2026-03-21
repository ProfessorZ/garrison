import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Megaphone, Send } from "lucide-react";
import { hllApi } from "../api/hll";

interface Props {
  serverId: number;
}

export default function HLLBroadcast({ serverId }: Props) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const broadcast = useMutation({
    mutationFn: () => hllApi.broadcast(serverId, message),
    onSuccess: () => {
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    },
  });

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3">
        <Megaphone className="h-4 w-4 text-[#fbbf24] shrink-0" />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && message.trim()) broadcast.mutate(); }}
          placeholder="Broadcast message to all players..."
          className="flex-1 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
          style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
        />
        <button
          onClick={() => broadcast.mutate()}
          disabled={!message.trim() || broadcast.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 shrink-0 transition-all"
          style={{ background: "#fbbf24" }}
        >
          <Send className="h-3 w-3" />
          {broadcast.isPending ? "Sending..." : "Broadcast"}
        </button>
        {sent && <span className="text-xs text-[#00d4aa] font-medium animate-fade-in shrink-0">Sent!</span>}
        {broadcast.isError && <span className="text-xs text-[#ff4757] shrink-0">Failed</span>}
      </div>
    </div>
  );
}
