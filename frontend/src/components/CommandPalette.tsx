import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { serversApi } from "../api/servers";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAddServer?: () => void;
  isAdmin?: boolean;
}

interface PalItem {
  group: string;
  label: string;
  hint: string;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  onAddServer,
  isAdmin,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(0);

  const { data: servers = [] } = useQuery({
    queryKey: ["servers"],
    queryFn: serversApi.list,
    enabled: open,
  });

  const items = useMemo(() => {
    const go = (path: string) => {
      navigate(path);
      onClose();
    };
    const all: PalItem[] = [
      ...servers.map((s) => ({
        group: "JUMP TO SERVER",
        label: s.name,
        hint: s.host,
        run: () => go(`/server/${s.id}`),
      })),
      { group: "GO TO", label: "Fleet overview", hint: "g f", run: () => go("/") },
      { group: "GO TO", label: "Players database", hint: "g p", run: () => go("/players") },
      { group: "GO TO", label: "Ban lists", hint: "g b", run: () => go("/ban-lists") },
      { group: "GO TO", label: "Activity log", hint: "g l", run: () => go("/activity") },
      { group: "GO TO", label: "Scheduler", hint: "g s", run: () => go("/scheduler") },
      ...(isAdmin
        ? [
            { group: "GO TO", label: "Triggers", hint: "", run: () => go("/scheduler?tab=triggers") },
            { group: "GO TO", label: "Discord integration", hint: "", run: () => go("/discord") },
            { group: "GO TO", label: "Plugins", hint: "", run: () => go("/plugins") },
            { group: "GO TO", label: "Operators", hint: "", run: () => go("/plugins?tab=operators") },
          ]
        : []),
      ...(onAddServer
        ? [
            {
              group: "ACTIONS",
              label: "Add server…",
              hint: "",
              run: () => {
                onClose();
                onAddServer();
              },
            },
          ]
        : []),
    ];
    const qq = q.toLowerCase().trim();
    return (qq ? all.filter((i) => i.label.toLowerCase().includes(qq)) : all).slice(0, 10);
  }, [servers, q, navigate, onClose, onAddServer, isAdmin]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSelected(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [q]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[selected]) {
      e.preventDefault();
      items[selected].run();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(5,4,3,0.75)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[560px] mx-4 animate-fade-in overflow-hidden"
        style={{
          border: "1px solid var(--border-accent)",
          borderRadius: 10,
          background: "var(--bg-card)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,178,36,0.08)",
        }}
      >
        <div
          className="flex items-center gap-3 px-[18px] py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="font-mono text-sm" style={{ color: "var(--accent)" }}>
            &gt;
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="type a command or destination…"
            className="flex-1 min-w-0 bg-transparent border-none shadow-none p-0 text-sm"
            style={{ boxShadow: "none", border: "none" }}
          />
          <span
            className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
            style={{ color: "var(--text-dim)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            ESC
          </span>
        </div>
        <div className="max-h-[340px] overflow-y-auto py-1.5">
          {items.length === 0 && (
            <p className="px-[18px] py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              no matches
            </p>
          )}
          {items.map((item, idx) => (
            <button
              key={`${item.group}-${item.label}`}
              onClick={item.run}
              onMouseEnter={() => setSelected(idx)}
              className="w-full flex items-center gap-3 px-[18px] py-2.5 text-left touch-compact"
              style={{
                background: idx === selected ? "rgba(255,178,36,0.08)" : "transparent",
                minHeight: "unset",
              }}
            >
              <span
                className="font-mono text-[9px] tracking-widest w-[110px] shrink-0"
                style={{ color: "var(--text-dim)" }}
              >
                {item.group}
              </span>
              <span className="text-[13px] flex-1" style={{ color: "var(--text-primary)" }}>
                {item.label}
              </span>
              <span className="font-mono text-[10px]" style={{ color: "var(--text-dim)" }}>
                {item.hint}
              </span>
            </button>
          ))}
        </div>
        <div
          className="px-[18px] py-2 font-mono text-[9.5px]"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "var(--text-dim)",
          }}
        >
          ↵ RUN · ⌘K TOGGLE · type a server name to jump to console
        </div>
      </div>
    </div>
  );
}
