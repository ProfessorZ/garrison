import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Send, Loader2, RotateCcw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import type { ConsoleLine } from "../types";

type ConnectionState = "connecting" | "connected" | "disconnected";

interface RconConsoleProps {
  serverId: number;
}

let lineIdCounter = 0;

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function RconConsole({ serverId }: RconConsoleProps) {
  const { token } = useAuth();
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [command, setCommand] = useState("");
  const [connState, setConnState] = useState<ConnectionState>("disconnected");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const addLine = useCallback(
    (type: ConsoleLine["type"], text: string) => {
      setLines((prev) => [
        ...prev,
        { id: ++lineIdCounter, timestamp: new Date(), type, text },
      ]);
    },
    []
  );

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current?.close();
    setConnState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${protocol}://${window.location.host}/api/ws/console/${serverId}?token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setConnState("connected");
      addLine("system", "Connected to server console.");
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.command) {
          addLine("command", data.command);
        }
        if (data.output) {
          addLine("output", data.output);
        }
        if (data.error) {
          addLine("error", data.error);
        }
      } catch {
        addLine("output", e.data);
      }
    };

    ws.onerror = () => {
      addLine("error", "WebSocket connection error.");
    };

    ws.onclose = () => {
      setConnState("disconnected");
      addLine("system", "Disconnected from server console.");
    };
  }, [token, serverId, addLine]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  const sendCommand = (e: FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd || !wsRef.current || connState !== "connected") return;

    wsRef.current.send(JSON.stringify({ command: cmd }));
    addLine("command", cmd);

    setCommandHistory((prev) => {
      const filtered = prev.filter((c) => c !== cmd);
      return [cmd, ...filtered].slice(0, 100);
    });
    setHistoryIndex(-1);
    setCommand("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommand("");
        return;
      }
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    }
  };

  const statusColor: Record<ConnectionState, string> = {
    connected: "text-emerald-400",
    connecting: "text-amber-400",
    disconnected: "text-red-400",
  };

  const statusBg: Record<ConnectionState, string> = {
    connected: "bg-emerald-400",
    connecting: "bg-amber-400",
    disconnected: "bg-red-400",
  };

  const lineColor: Record<ConsoleLine["type"], string> = {
    command: "text-emerald-400",
    output: "text-slate-300",
    error: "text-red-400",
    system: "text-amber-400/80",
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/80">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${statusBg[connState]} ${
              connState === "connecting" ? "animate-pulse" : ""
            }`}
          />
          <span className={`font-medium ${statusColor[connState]}`}>
            {connState === "connected" && "Connected"}
            {connState === "connecting" && "Connecting..."}
            {connState === "disconnected" && "Disconnected"}
          </span>
        </div>
        {connState === "disconnected" && (
          <button
            onClick={connect}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reconnect
          </button>
        )}
        {connState === "connecting" && (
          <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
        )}
      </div>

      {/* Console output */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="h-[28rem] overflow-y-auto p-4 font-mono text-sm bg-slate-950 cursor-text"
      >
        {lines.length === 0 && (
          <p className="text-slate-600 select-none">
            Waiting for connection... Type a command below to get started.
          </p>
        )}
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2 leading-relaxed">
            <span className="text-slate-600 select-none shrink-0 text-xs leading-relaxed">
              {formatTime(line.timestamp)}
            </span>
            {line.type === "command" && (
              <span className="text-slate-600 select-none">&gt;</span>
            )}
            <span className={`${lineColor[line.type]} whitespace-pre-wrap break-all`}>
              {line.text}
            </span>
          </div>
        ))}
      </div>

      {/* Command input */}
      <form
        onSubmit={sendCommand}
        className="flex items-center gap-2 p-3 border-t border-slate-700 bg-slate-800"
      >
        <span className="text-emerald-500 font-mono text-sm select-none">$</span>
        <input
          ref={inputRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            connState === "connected"
              ? "Enter RCON command..."
              : "Waiting for connection..."
          }
          disabled={connState !== "connected"}
          className="flex-1 bg-transparent border-none px-1 py-1.5 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={connState !== "connected" || !command.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </button>
      </form>
    </div>
  );
}
