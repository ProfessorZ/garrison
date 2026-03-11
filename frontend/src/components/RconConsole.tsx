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
import { Send, Loader2, RotateCcw } from "lucide-react";
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

  // Fetch command schema for autocomplete
  const { data: commandSchema } = useQuery({
    queryKey: ["game-commands", gameType],
    queryFn: () => commandsApi.getCommands(gameType),
    staleTime: Infinity,
  });

  const allCommands = useMemo(() => commandSchema?.commands ?? [], [commandSchema]);

  // Filter commands based on current input
  const filteredCommands = useMemo(() => {
    const input = command.trim().toLowerCase();
    if (!input) return allCommands;
    return allCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(input) ||
        cmd.description.toLowerCase().includes(input)
    );
  }, [command, allCommands]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, GameCommand[]> = {};
    for (const cmd of filteredCommands) {
      const cat = cmd.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  // Flat list for keyboard navigation
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

  // Show autocomplete when typing, hide when empty or has a space (already typing args)
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
        if (flatList[selectedIndex]) {
          selectCommand(flatList[selectedIndex]);
        }
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
      // If Enter is pressed but no autocomplete match, fall through to send
      if (e.key === "Enter") return;
    }

    // History navigation (only when autocomplete is hidden)
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

  // Scroll selected autocomplete item into view
  useEffect(() => {
    if (!showAutocomplete || !autocompleteRef.current) return;
    const items = autocompleteRef.current.querySelectorAll("[data-ac-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, showAutocomplete]);

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

      {/* Command input + autocomplete */}
      <div className="relative">
        {/* Autocomplete dropdown */}
        {showAutocomplete && flatList.length > 0 && (
          <div
            ref={autocompleteRef}
            className="absolute bottom-full left-0 right-0 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-t-lg shadow-xl z-10"
          >
            {Object.keys(groupedCommands)
              .sort()
              .map((category) => (
                <div key={category}>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-800/50 sticky top-0">
                    {CATEGORY_LABELS[category] || category}
                  </div>
                  {groupedCommands[category].map((cmd) => {
                    const idx = flatList.indexOf(cmd);
                    return (
                      <div
                        key={cmd.name}
                        data-ac-item
                        onClick={() => selectCommand(cmd)}
                        className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm transition-colors ${
                          idx === selectedIndex
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-medium text-emerald-400 shrink-0">
                            {cmd.name}
                          </span>
                          <span className="text-xs text-slate-500 truncate">
                            {cmd.description}
                          </span>
                        </div>
                        {idx === selectedIndex && (
                          <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                            Tab to complete
                          </span>
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
            autoComplete="off"
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
    </div>
  );
}
