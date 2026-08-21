import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Trash2, Clock } from "lucide-react";
import type { Server as ServerType, ServerStatus } from "../types";
import ConfirmModal from "./ConfirmModal";
import { gameIcon, gameShort } from "../lib/gameMeta";

interface ServerCardProps {
  server: ServerType;
  status?: ServerStatus | null;
  onDelete: (id: number) => void;
}

export default function ServerCard({
  server,
  status,
  onDelete,
}: ServerCardProps) {
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const isLoading = status === undefined;
  const isOnline = status?.online ?? false;

  return (
    <>
      <div
        onClick={() => navigate(`/server/${server.id}`)}
        className="rounded-xl p-5 cursor-pointer group transition-all duration-150 hover:-translate-y-px"
        style={{
          background: "#0e0c09",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
      >
        {/* Top row: status + name */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                  isLoading
                    ? "bg-[#6b6455] animate-pulse"
                    : isOnline
                      ? "bg-[#ffb224] status-online"
                      : "bg-[#d96b5c]"
                }`}
              />
              <h3 className="text-base font-bold text-[#e8e3d8] group-hover:text-[#ffb224] transition-colors truncate">
                {server.name}
              </h3>
            </div>
          </div>
          {isOnline && status?.player_count != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-[#ffb224] shrink-0"
              style={{ background: "rgba(255, 178, 36,0.08)" }}>
              <Users className="h-3 w-3" />
              {status.player_count}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs text-[#6b6455] mb-3">
          <span className="font-mono text-[#8a8271]">{server.host}:{server.port}</span>
          <span className="text-[rgba(255,255,255,0.12)]">&middot;</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono gap-1"
            style={{ background: "#12100b", color: "#8a8271" }}>
            {gameIcon(server.game_type)} {gameShort(server.game_type)}
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6b6455]">
            <Clock className="h-3 w-3" />
            <span>
              {isLoading
                ? "Checking..."
                : `Checked ${new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(true);
            }}
            className="p-1.5 rounded-md text-[#6b6455] hover:text-[#d96b5c] transition-all duration-150 opacity-0 group-hover:opacity-100"
            style={{ background: "transparent" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Delete Server"
        message={`Are you sure you want to delete "${server.name}"? This action cannot be undone.`}
        confirmLabel="Delete Server"
        variant="danger"
        onConfirm={() => {
          onDelete(server.id);
          setShowDelete(false);
        }}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
