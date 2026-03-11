import { useState, useEffect, useRef, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";

interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  rcon_port: number;
  game_type: string;
}

interface Player {
  name: string;
}

interface ConsoleEntry {
  command: string;
  output: string;
}

export default function ServerPage({ token }: { token: string | null }) {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useApi(token);
  const [server, setServer] = useState<Server | null>(null);
  const [tab, setTab] = useState<"console" | "players" | "chat">("console");
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<ConsoleEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch(`/api/servers/${id}`).then(setServer).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/servers/${id}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setHistory((prev) => [...prev, { command: data.command, output: data.output }]);
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

  const loadPlayers = async () => {
    try {
      const data = await apiFetch(`/api/servers/${id}/players`);
      setPlayers(data.players);
    } catch {}
  };

  const loadChat = async () => {
    try {
      const data = await apiFetch(`/api/servers/${id}/chat`);
      setChatMessages(data.messages);
    } catch {}
  };

  useEffect(() => {
    if (tab === "players") loadPlayers();
    if (tab === "chat") loadChat();
  }, [tab]);

  const kickPlayer = async (name: string) => {
    await apiFetch(`/api/servers/${id}/players/${encodeURIComponent(name)}/kick`, { method: "POST" });
    loadPlayers();
  };

  const banPlayer = async (name: string) => {
    if (!confirm(`Ban ${name}?`)) return;
    await apiFetch(`/api/servers/${id}/players/${encodeURIComponent(name)}/ban`, { method: "POST" });
    loadPlayers();
  };

  if (!server) return <p style={{ color: "var(--text-muted)" }}>Loading server...</p>;

  const tabs = ["console", "players", "chat"] as const;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{server.name}</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        {server.host}:{server.port} &middot; {server.game_type}
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "btn-primary" : "btn-secondary"}
            style={{ fontSize: 13, textTransform: "capitalize" }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "console" && (
        <div className="card">
          <div
            style={{
              height: 400,
              overflowY: "auto",
              background: "var(--bg-primary)",
              borderRadius: 6,
              padding: 12,
              fontFamily: "monospace",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {history.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>Type a command below to get started...</p>
            )}
            {history.map((entry, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ color: "var(--accent)" }}>&gt; {entry.command}</div>
                <div style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{entry.output}</div>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
          <form onSubmit={sendCommand} style={{ display: "flex", gap: 8 }}>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter RCON command..."
              style={{ fontFamily: "monospace" }}
            />
            <button className="btn-primary" type="submit">
              Send
            </button>
          </form>
        </div>
      )}

      {tab === "players" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Players ({players.length})</h3>
            <button className="btn-secondary" style={{ fontSize: 13 }} onClick={loadPlayers}>
              Refresh
            </button>
          </div>
          {players.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No players online or server unreachable.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: 13 }}>Name</th>
                  <th style={{ textAlign: "right", padding: 8, color: "var(--text-secondary)", fontSize: 13 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 8, fontSize: 14 }}>{p.name}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>
                      <button className="btn-secondary" style={{ fontSize: 12, marginRight: 6 }} onClick={() => kickPlayer(p.name)}>
                        Kick
                      </button>
                      <button className="btn-danger" style={{ fontSize: 12 }} onClick={() => banPlayer(p.name)}>
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
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Chat Log</h3>
            <button className="btn-secondary" style={{ fontSize: 13 }} onClick={loadChat}>
              Refresh
            </button>
          </div>
          <div
            style={{
              height: 400,
              overflowY: "auto",
              background: "var(--bg-primary)",
              borderRadius: 6,
              padding: 12,
              fontSize: 13,
            }}
          >
            {chatMessages.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No chat messages available.</p>
            ) : (
              chatMessages.map((msg, i) => (
                <p key={i} style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
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
