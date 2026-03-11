import { Link } from "react-router-dom";
import {
  Server,
  Users,
  Wifi,
  WifiOff,
  Trash2,
  Settings,
} from "lucide-react";
import type { Server as ServerType, ServerStatus } from "../types";

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
  const isLoading = status === undefined;
  const isOnline = status?.online ?? false;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/server/${server.id}`}
            className="text-base font-semibold text-slate-100 hover:text-emerald-400 transition-colors block truncate"
          >
            {server.name}
          </Link>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Server className="h-3 w-3" />
            {server.host}:{server.port}
            <span className="text-slate-600">&middot;</span>
            {server.game_type}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
            isLoading
              ? "bg-slate-700 text-slate-400"
              : isOnline
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
          }`}
        >
          {isLoading ? (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
              ...
            </>
          ) : isOnline ? (
            <>
              <Wifi className="h-3 w-3" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Offline
            </>
          )}
        </span>
      </div>

      {isOnline && status?.player_count !== null && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {status?.player_count} player
          {status?.player_count !== 1 ? "s" : ""} online
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-700">
        <Link
          to={`/server/${server.id}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
        >
          <Settings className="h-3 w-3" />
          Manage
        </Link>
        <button
          onClick={() => {
            if (confirm("Delete this server?")) onDelete(server.id);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  );
}
