import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { commandsApi } from "../api/commands";
import type { ConsoleLine, GameCommand } from "../types";

type ConnectionState = "connecting" | "connected" | "disconnected";

interface RconConsoleProps {
  serverId: number;
  gameType?: string;
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

const CATEGORY_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  PLAYER_MGMT: "Player Management",
  WORLD: "World",
  MODERATION: "Moderation",
  SERVER: "Server",
  WHITELIST: "Whitelist",
  DEBUG: "Debug",
};

export default function RconConsole({ serverId, gameType = "zomboid" }: RconConsoleProps) {
  const { token } = useAuth();
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [command, setCommand] = useState("");
  const [connState, setConnState] = useState<ConnectionState>("disconnected");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const { data: commandSchema } = useQuery({
    queryKey: ["game-commands", gameType],
    queryFn: () => commandsApi.getCommands(gameType),
    staleTime: Infinity,
  });

  const allCommands = useMemo(() => commandSchema?.commands ?? [], [commandSchema]);

  const filteredCommands = useMemo(() => {
    const input = command.trim().toLowerCase();
    if (!input) return allCommands;
    return allCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(input) ||
        cmd.description.toLowerCase().includes(input)
    );
  }, [command, allCommands]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, GameCommand[]> = {};
    for (const cmd of filteredCommands) {
      const cat = cmd.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const flatList = useMemo(() => {
    const result: GameCommand[] = [];
    for (const cat of Object.keys(groupedCommands).sort()) {
      result.push(...groupedCommands[cat]);
    }
    return result;
  }, [groupedCommands]);

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
        if (data.command) addLine("command", data.command);
        if (data.output) addLine("output", data.output);
        if (data.error) addLine("error", data.error);
      } catch {
        addLine("output", e.data);
      }
    };

    ws.onerror = () => addLine("error", "WebSocket connection error.");

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

  useEffect(() => {
    const input = command.trim();
    if (input && !input.includes(" ") && allCommands.length > 0 && filteredCommands.length > 0) {
      setShowAutocomplete(true);
      setSelectedIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, [command, allCommands.length, filteredCommands.length]);

  const selectCommand = (cmd: GameCommand) => {
    setCommand(cmd.name + " ");
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

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
    setShowAutocomplete(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete) {
      if (e.key === "Tab" || (e.key === "Enter" && flatList.length > 0)) {
        e.preventDefault();
        if (flatList[selectedIndex]) selectCommand(flatList[selectedIndex]);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
      if (e.key === "Enter") return;
    }

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

  useEffect(() => {
    if (!showAutocomplete || !autocompleteRef.current) return;
    const items = autocompleteRef.current.querySelectorAll("[data-ac-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, showAutocomplete]);

  const lineColor: Record<ConsoleLine["type"], string> = {
    command: "#e2e8f0",
    output: "#00d4aa",
    error: "#ff4757",
    system: "rgba(255,165,2,0.7)",
  };

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#111827",
      }}>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connState === "connecting" ? "bg-[#ffa502] animate-pulse" :
              connState === "connected" ? "bg-[#00d4aa] status-online" :
              "bg-[#ff4757]"
            }`}
          />
          <span className="font-semibold" style={{
            color: connState === "connected" ? "#00d4aa" :
                   connState === "connecting" ? "#ffa502" : "#ff4757"
          }}>
            {connState === "connected" && "Connected"}
            {connState === "connecting" && "Connecting..."}
            {connState === "disconnected" && "Disconnected"}
          </span>
        </div>
        {connState === "disconnected" && (
          <button
            onClick={connect}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-[#e2e8f0] transition-all duration-150"
            style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <RotateCcw className="h-3 w-3" />
            Reconnect
          </button>
        )}
        {connState === "connecting" && (
          <Loader2 className="h-3.5 w-3.5 text-[#ffa502] animate-spin" />
        )}
      </div>

      {/* Console output — TRUE black */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="h-[28rem] overflow-y-auto p-4 cursor-text"
        style={{ background: "#000", fontFamily: "var(--font-mono)" }}
      >
        {lines.length === 0 && (
          <p className="text-[#64748b] select-none text-sm">
            Waiting for connection...
          </p>
        )}
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2.5 text-sm leading-relaxed">
            <span className="text-[#64748b] select-none shrink-0 text-xs leading-relaxed tabular-nums">
              {formatTime(line.timestamp)}
            </span>
            {line.type === "command" && (
              <span className="text-[#64748b] select-none">&gt;</span>
            )}
            <span className="whitespace-pre-wrap break-all" style={{ color: lineColor[line.type] }}>
              {line.text}
            </span>
          </div>
        ))}
      </div>

      {/* Autocomplete + input */}
      <div className="relative">
        {showAutocomplete && flatList.length > 0 && (
          <div
            ref={autocompleteRef}
            className="absolute bottom-full left-0 right-0 max-h-64 overflow-y-auto rounded-t-lg shadow-2xl z-10"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }}
          >
            {Object.keys(groupedCommands)
              .sort()
              .map((category) => (
                <div key={category}>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b] sticky top-0"
                    style={{ background: "#111827" }}>
                    {CATEGORY_LABELS[category] || category}
                  </div>
                  {groupedCommands[category].map((cmd) => {
                    const idx = flatList.indexOf(cmd);
                    return (
                      <div
                        key={cmd.name}
                        data-ac-item
                        onClick={() => selectCommand(cmd)}
                        className="flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm transition-colors"
                        style={{
                          background: idx === selectedIndex ? "rgba(0,212,170,0.08)" : "transparent",
                          color: idx === selectedIndex ? "#00d4aa" : "#e2e8f0",
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span style={{ fontFamily: "var(--font-mono)", color: "#00d4aa", fontWeight: 500, flexShrink: 0 }}>
                            {cmd.name}
                          </span>
                          <span className="text-xs text-[#64748b] truncate">{cmd.description}</span>
                        </div>
                        {idx === selectedIndex && (
                          <span className="text-[10px] text-[#64748b] shrink-0 ml-2">Tab</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}

        <form
          onSubmit={sendCommand}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0a0e1a" }}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
              connState === "connected" ? "bg-[#00d4aa] status-online" : "bg-[#64748b]"
            }`}
          />
          <span className="text-[#00d4aa] select-none text-sm" style={{ fontFamily: "var(--font-mono)" }}>&gt;</span>
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
            autoComplete="off"
            className="flex-1 bg-transparent border-none px-0 py-1 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:ring-0 focus:border-none disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono)", boxShadow: "none" }}
          />
        </form>
      </div>
    </div>
  );
}
