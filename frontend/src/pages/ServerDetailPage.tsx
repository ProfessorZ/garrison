import { useState, useEffect, useRef, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  RefreshCw,
  UserX,
  Ban,
  Terminal,
  Users,
  MessageSquare,
} from "lucide-react";
import { serversApi } from "../api/servers";
import { useAuth } from "../contexts/AuthContext";

interface ConsoleEntry {
  command: string;
  output: string;
}

type Tab = "console" | "players" | "chat";

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const serverId = Number(id);

  const [tab, setTab] = useState<Tab>("console");
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<ConsoleEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const { data: server } = useQuery({
    queryKey: ["server", serverId],
    queryFn: () => serversApi.get(serverId),
    enabled: !isNaN(serverId),
  });

  const { data: status } = useQuery({
    queryKey: ["server-status", serverId],
    queryFn: () => serversApi.getStatus(serverId),
    enabled: !isNaN(serverId),
    refetchInterval: 15000,
  });

  const {
    data: playersData,
    refetch: refetchPlayers,
  } = useQuery({
    queryKey: ["server-players", serverId],
    queryFn: () => serversApi.getPlayers(serverId),
    enabled: !isNaN(serverId) && tab === "players",
  });

  useEffect(() => {
    if (!token || !id) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${protocol}://${window.location.host}/api/servers/${id}/ws?token=${token}`
    );
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setHistory((prev) => [
        ...prev,
        { command: data.command, output: data.output },
      ]);
    };

    return () => {
      ws.close();
    };
  }, [id, token]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const sendCommand = (e: FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ command }));
    setCommand("");
  };

  const loadChat = async () => {
    try {
      const data = await serversApi.getChat(serverId);
      setChatMessages(data.messages);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (tab === "chat") loadChat();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const kickPlayer = async (name: string) => {
    const { default: client } = await import("../api/client");
    await client.post(
      `/servers/${serverId}/players/${encodeURIComponent(name)}/kick`
    );
    refetchPlayers();
  };

  const banPlayer = async (name: string) => {
    if (!confirm(`Ban ${name}?`)) return;
    const { default: client } = await import("../api/client");
    await client.post(
      `/servers/${serverId}/players/${encodeURIComponent(name)}/ban`
    );
    refetchPlayers();
  };

  if (!server) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Terminal }[] = [
    { key: "console", label: "Console", icon: Terminal },
    { key: "players", label: "Players", icon: Users },
    { key: "chat", label: "Chat", icon: MessageSquare },
  ];

  const players = playersData?.players ?? [];

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to servers
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-100">
            {server.name}
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              status?.online
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {status?.online ? "Online" : "Offline"}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {server.host}:{server.port} &middot; {server.game_type}
          {status?.online &&
            status.player_count !== null &&
            ` \u00b7 ${status.player_count} players`}
        </p>
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-700 pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "console" && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="h-96 overflow-y-auto p-4 font-mono text-sm bg-slate-900">
            {history.length === 0 && (
              <p className="text-slate-600">
                Type a command below to get started...
              </p>
            )}
            {history.map((entry, i) => (
              <div key={i} className="mb-3">
                <div className="text-emerald-400">
                  <span className="text-slate-600 select-none">&gt; </span>
                  {entry.command}
                </div>
                <div className="text-slate-400 whitespace-pre-wrap mt-0.5">
                  {entry.output}
                </div>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
          <form
            onSubmit={sendCommand}
            className="flex items-center gap-2 p-3 border-t border-slate-700"
          >
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter RCON command..."
              className="flex-1 rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </form>
        </div>
      )}

      {tab === "players" && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200">
              Players ({players.length})
            </h3>
            <button
              onClick={() => refetchPlayers()}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
          {players.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              No players online or server unreachable.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                    Name
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr
                    key={p.name}
                    className="border-b border-slate-700/50 last:border-0"
                  >
                    <td className="px-4 py-2.5 text-sm text-slate-200">
                      {p.name}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => kickPlayer(p.name)}
                        className="inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 mr-2 transition-colors"
                      >
                        <UserX className="h-3 w-3" />
                        Kick
                      </button>
                      <button
                        onClick={() => banPlayer(p.name)}
                        className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Ban className="h-3 w-3" />
                        Ban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200">Chat Log</h3>
            <button
              onClick={loadChat}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
          <div className="h-96 overflow-y-auto p-4 text-sm">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500">No chat messages available.</p>
            ) : (
              chatMessages.map((msg, i) => (
                <p key={i} className="text-slate-400 mb-1">
                  {msg}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
