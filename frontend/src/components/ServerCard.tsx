import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Server,
  Users,
  Trash2,
  Settings,
  Clock,
} from "lucide-react";
import type { Server as ServerType, ServerStatus } from "../types";
import ConfirmModal from "./ConfirmModal";

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

  const statusDot = isLoading
    ? "bg-slate-400 animate-pulse"
    : isOnline
      ? "bg-emerald-400"
      : "bg-red-400";

  const statusLabel = isLoading ? "Checking..." : isOnline ? "Online" : "Offline";

  return (
    <>
      <div
        onClick={() => navigate(`/server/${server.id}`)}
        className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-slate-600 transition-colors cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
              {server.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Server className="h-3 w-3" />
              {server.host}:{server.port}
              <span className="text-slate-600">&middot;</span>
              {server.game_type}
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {isOnline && status?.player_count !== null && status?.player_count !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                <Users className="h-3 w-3" />
                {status.player_count}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isLoading
                  ? "bg-slate-700 text-slate-400"
                  : isOnline
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/15 text-red-400"
              }`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusDot}`} />
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Last checked */}
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
          <Clock className="h-3 w-3" />
          <span>
            {isLoading
              ? "Checking status..."
              : `Checked ${new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}`}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-700">
          <Link
            to={`/server/${server.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Settings className="h-3 w-3" />
            Manage
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Delete
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
