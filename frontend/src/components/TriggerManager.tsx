import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pause,
  Play,
  Trash2,
  Edit3,
  Zap,
  TestTube,
} from "lucide-react";
import { triggersApi } from "../api/triggers";
import type { Trigger } from "../types";
import TriggerModal, { type TriggerFormData } from "./TriggerModal";

const EVENT_LABELS: Record<string, string> = {
  player_join: "Player Join",
  player_leave: "Player Leave",
  player_count_above: "Count Above",
  player_count_below: "Count Below",
  server_online: "Server Online",
  server_offline: "Server Offline",
  chat_message: "Chat Message",
};

const ACTION_LABELS: Record<string, string> = {
  rcon_command: "RCON Command",
  discord_webhook: "Discord Webhook",
  kick_player: "Kick Player",
  ban_player: "Ban Player",
};

const EVENT_COLORS: Record<string, string> = {
  player_join: "#00d4aa",
  player_leave: "#ff4757",
  player_count_above: "#ffa502",
  player_count_below: "#ffa502",
  server_online: "#00d4aa",
  server_offline: "#ff4757",
  chat_message: "#3b82f6",
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  serverId?: number;
}

export default function TriggerManager({ serverId }: Props) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; text: string } | null>(null);

  const queryKey = serverId ? ["triggers", "server", serverId] : ["triggers"];

  const { data: triggers = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => serverId ? triggersApi.listForServer(serverId) : triggersApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: TriggerFormData) => triggersApi.create({
      ...data,
      server_id: data.server_id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TriggerFormData }) => triggersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setModalOpen(false);
      setEditingTrigger(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => triggersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => triggersApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => triggersApi.test(id),
    onSuccess: (data, id) => {
      setTestResult({ id, text: data.result });
      queryClient.invalidateQueries({ queryKey });
      setTimeout(() => setTestResult(null), 5000);
    },
  });

  const handleSave = (data: TriggerFormData) => {
    // Clean up empty condition
    const cleanCondition = data.condition && Object.values(data.condition).some((v) => v !== undefined && v !== "")
      ? Object.fromEntries(Object.entries(data.condition).filter(([, v]) => v !== undefined && v !== ""))
      : null;

    const cleanData = { ...data, condition: cleanCondition };

    if (editingTrigger) {
      updateMutation.mutate({ id: editingTrigger.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const openEdit = (t: Trigger) => {
    setEditingTrigger(t);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingTrigger(null);
    setModalOpen(true);
  };

  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">
          Triggers
        </h3>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150"
          style={{ background: "#00d4aa", color: "#0a0e1a" }}
        >
          <Plus className="h-3 w-3" /> Add Trigger
        </button>
      </div>

      {/* Trigger list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
        </div>
      ) : triggers.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Zap className="h-8 w-8 text-[#1a1f2e] mx-auto mb-2" />
          <p className="text-sm text-[#94a3b8]">No triggers configured</p>
          <p className="text-xs text-[#64748b] mt-1">Add a trigger to automate actions on server events</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Name", "Event", "Action", "Status", "Last Fired", "Fires", "Actions"].map((h, i) => (
                  <th key={h} className={`${i === 6 ? "text-right" : "text-left"} px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {triggers.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="px-4 py-2.5">
                    <div className="text-sm text-[#e2e8f0] font-medium">{t.name}</div>
                    {t.server_name && (
                      <div className="text-[11px] text-[#64748b]">{t.server_name}</div>
                    )}
                    {!t.server_id && (
                      <div className="text-[11px] text-[#ffa502]">Global</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        background: `${EVENT_COLORS[t.event_type] || "#3b82f6"}15`,
                        color: EVENT_COLORS[t.event_type] || "#3b82f6",
                      }}
                    >
                      {EVENT_LABELS[t.event_type] || t.event_type}
                    </span>
                    {t.event_config && t.event_type === "chat_message" && !!(t.event_config as Record<string, unknown>).pattern && (
                      <div className="text-[11px] text-[#64748b] mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                        /{String((t.event_config as Record<string, unknown>).pattern)}/
                      </div>
                    )}
                    {t.event_config && (t.event_type === "player_count_above" || t.event_type === "player_count_below") && (
                      <div className="text-[11px] text-[#64748b] mt-0.5">
                        Threshold: {String((t.event_config as Record<string, unknown>).threshold)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs text-[#94a3b8]">{ACTION_LABELS[t.action_type] || t.action_type}</div>
                    {t.action_type === "rcon_command" && t.action_config && (
                      <div className="text-[11px] text-[#64748b] mt-0.5 max-w-[180px] truncate" style={{ fontFamily: "var(--font-mono)" }}>
                        {String((t.action_config as Record<string, unknown>).command || "")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${t.is_active ? "text-[#00d4aa]" : "text-[#64748b]"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${t.is_active ? "bg-[#00d4aa] status-online" : "bg-[#64748b]"}`} />
                      {t.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b]">{timeAgo(t.last_fired_at)}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b]" style={{ fontFamily: "var(--font-mono)" }}>{t.fire_count}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => testMutation.mutate(t.id)}
                        disabled={testMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#e2e8f0] transition-all duration-150"
                        style={inputStyle}
                        title="Test"
                      >
                        <TestTube className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate(t.id)}
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs text-[#e2e8f0] transition-all duration-150"
                        style={inputStyle}
                        title={t.is_active ? "Pause" : "Resume"}
                      >
                        {t.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => openEdit(t)}
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs text-[#e2e8f0] transition-all duration-150"
                        style={inputStyle}
                        title="Edit"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this trigger?")) deleteMutation.mutate(t.id); }}
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs text-[#ff4757] transition-all duration-150"
                        style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.12)" }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {testResult?.id === t.id && (
                      <div className="text-[11px] text-[#00d4aa] mt-1 text-right max-w-[200px] truncate animate-fade-in">
                        {testResult.text}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <TriggerModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTrigger(null); }}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
        trigger={editingTrigger}
        serverId={serverId}
      />
    </div>
  );
}
