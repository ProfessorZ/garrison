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
    <div className="rounded-xl p-4 mb-4" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3">
        <Megaphone className="h-4 w-4 text-[#e3b454] shrink-0" />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && message.trim()) broadcast.mutate(); }}
          placeholder="Broadcast message to all players..."
          className="flex-1 rounded-lg px-3 py-2.5 text-sm text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none"
          style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
        />
        <button
          onClick={() => broadcast.mutate()}
          disabled={!message.trim() || broadcast.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold text-[#0b0a08] disabled:opacity-50 shrink-0 transition-all"
          style={{ background: "#e3b454" }}
        >
          <Send className="h-3 w-3" />
          {broadcast.isPending ? "Sending..." : "Broadcast"}
        </button>
        {sent && <span className="text-xs text-[#ffb224] font-medium animate-fade-in shrink-0">Sent!</span>}
        {broadcast.isError && <span className="text-xs text-[#d96b5c] shrink-0">Failed</span>}
      </div>
    </div>
  );
}
