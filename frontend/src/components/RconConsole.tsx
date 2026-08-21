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
    queryFn: () => commandsApi.getCommands(gameType).catch(() => null),
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
        const cleanOutput = (s: string) => s && s.trim() !== "None" ? s : null;
        if (data.type === "response") {
          // Command echo + output from server
          if (data.command) addLine("command", data.command);
          const out = cleanOutput(data.output);
          if (out) addLine("output", out);
        } else if (data.type === "history") {
          // Replay history on connect
          for (const entry of data.entries ?? []) {
            if (entry.command) addLine("command", entry.command);
            const out = cleanOutput(entry.output);
            if (out) addLine("output", out);
          }
        } else if (data.type === "error") {
          addLine("error", data.message ?? data.error ?? "Unknown error");
        } else if (data.type === "connected") {
          // already handled by ws.onopen
        } else if (data.type === "ping") {
          // no-op
        } else {
          // Fallback for older/unknown formats
          if (data.command) addLine("command", data.command);
          const out = cleanOutput(data.output);
          if (out) addLine("output", out);
          if (data.error) addLine("error", data.error);
        }
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
    command: "#e8e3d8",
    output: "#ffb224",
    error: "#d96b5c",
    system: "rgba(255,165,2,0.7)",
  };

  return (
    <div className="rounded-lg overflow-hidden flex flex-col" style={{
      background: "#080705",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div className="flex items-center justify-between px-3.5 py-2" style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#080705",
      }}>
        <div className="flex items-center gap-2.5 font-mono text-[10px]">
          <span className="tracking-widest" style={{ color: "var(--accent)" }}>RCON CONSOLE</span>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              connState === "connecting" ? "bg-[#e3b454] animate-pulse" :
              connState === "connected" ? "bg-[#9de26b] blink" :
              "bg-[#d96b5c]"
            }`}
          />
          <span style={{
            color: connState === "connected" ? "#9de26b" :
                   connState === "connecting" ? "#e3b454" : "#d96b5c"
          }}>
            {connState === "connected" && "session live · history ↑↓ · tab to complete"}
            {connState === "connecting" && "connecting…"}
            {connState === "disconnected" && "disconnected"}
          </span>
        </div>
        {connState === "disconnected" && (
          <button
            onClick={connect}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-[#e8e3d8] transition-all duration-150"
            style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <RotateCcw className="h-3 w-3" />
            Reconnect
          </button>
        )}
        {connState === "connecting" && (
          <Loader2 className="h-3.5 w-3.5 text-[#e3b454] animate-spin" />
        )}
      </div>

      {/* Console output — TRUE black */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="overflow-y-auto p-4 cursor-text h-[300px] sm:h-[28rem]"
        style={{ background: "#000", fontFamily: "var(--font-mono)" }}
      >
        {lines.length === 0 && (
          <p className="text-[#6b6455] select-none text-sm">
            Waiting for connection...
          </p>
        )}
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2.5 text-sm leading-relaxed">
            <span className="text-[#6b6455] select-none shrink-0 text-xs leading-relaxed tabular-nums">
              {formatTime(line.timestamp)}
            </span>
            {line.type === "command" && (
              <span className="text-[#6b6455] select-none">&gt;</span>
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
            className="absolute bottom-full left-0 right-0 overflow-y-auto rounded-t-lg shadow-2xl z-10"
            style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none", maxHeight: 200 }}
          >
            {Object.keys(groupedCommands)
              .sort()
              .map((category) => (
                <div key={category}>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b6455] sticky top-0"
                    style={{ background: "#0e0c09" }}>
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
                          background: idx === selectedIndex ? "rgba(255, 178, 36,0.08)" : "transparent",
                          color: idx === selectedIndex ? "#ffb224" : "#e8e3d8",
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span style={{ fontFamily: "var(--font-mono)", color: "#ffb224", fontWeight: 500, flexShrink: 0 }}>
                            {cmd.name}
                          </span>
                          <span className="text-xs text-[#6b6455] truncate">{cmd.description}</span>
                        </div>
                        {idx === selectedIndex && (
                          <span className="text-[10px] text-[#6b6455] shrink-0 ml-2">Tab</span>
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
          className="flex items-center gap-2.5 px-4 py-3"
          style={{ borderTop: "1px solid var(--border-accent)", background: "#0b0a08" }}
        >
          <span className="text-[#ffb224] select-none text-[13px] font-mono shrink-0">&gt;</span>
          <input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connState === "connected"
                ? "enter rcon command… (try: players, save, help)"
                : "waiting for connection…"
            }
            disabled={connState !== "connected"}
            autoComplete="off"
            className="flex-1 bg-transparent border-none px-0 py-1 text-[13px] text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none focus:ring-0 focus:border-none disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono)", boxShadow: "none" }}
          />
          <span className="blink w-2 h-[15px] shrink-0" style={{ background: "var(--accent)", opacity: 0.7 }} />
        </form>
      </div>
    </div>
  );
}
