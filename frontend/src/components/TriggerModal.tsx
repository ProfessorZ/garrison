import { useState, useEffect, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Trigger, TriggerEventType, TriggerActionType } from "../types";

const EVENT_TYPES: { value: TriggerEventType; label: string; description: string }[] = [
  { value: "player_join", label: "Player Join", description: "Fires when a player connects" },
  { value: "player_leave", label: "Player Leave", description: "Fires when a player disconnects" },
  { value: "player_count_above", label: "Player Count Above", description: "Fires when player count exceeds threshold" },
  { value: "player_count_below", label: "Player Count Below", description: "Fires when player count drops below threshold" },
  { value: "server_online", label: "Server Online", description: "Fires when server comes online" },
  { value: "server_offline", label: "Server Offline", description: "Fires when server goes offline" },
  { value: "chat_message", label: "Chat Message", description: "Fires when chat matches a pattern" },
];

const ACTION_TYPES: { value: TriggerActionType; label: string; description: string }[] = [
  { value: "rcon_command", label: "RCON Command", description: "Send an RCON command to the server" },
  { value: "discord_webhook", label: "Discord Webhook", description: "Send a Discord notification" },
  { value: "kick_player", label: "Kick Player", description: "Kick the triggering player" },
  { value: "ban_player", label: "Ban Player", description: "Ban the triggering player" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: TriggerFormData) => void;
  saving: boolean;
  trigger?: Trigger | null;
  serverId?: number;
}

export interface TriggerFormData {
  server_id?: number | null;
  name: string;
  description: string;
  event_type: TriggerEventType;
  event_config: Record<string, unknown>;
  action_type: TriggerActionType;
  action_config: Record<string, unknown>;
  condition: Record<string, unknown> | null;
  cooldown_seconds: number;
  is_active: boolean;
}

export default function TriggerModal({ open, onClose, onSave, saving, trigger, serverId }: Props) {
  const [form, setForm] = useState<TriggerFormData>({
    server_id: serverId ?? null,
    name: "",
    description: "",
    event_type: "player_join",
    event_config: {},
    action_type: "rcon_command",
    action_config: {},
    condition: null,
    cooldown_seconds: 0,
    is_active: true,
  });

  const [showConditions, setShowConditions] = useState(false);

  useEffect(() => {
    if (trigger) {
      setForm({
        server_id: trigger.server_id ?? serverId ?? null,
        name: trigger.name,
        description: trigger.description || "",
        event_type: trigger.event_type,
        event_config: (trigger.event_config as Record<string, unknown>) || {},
        action_type: trigger.action_type,
        action_config: (trigger.action_config as Record<string, unknown>) || {},
        condition: (trigger.condition as Record<string, unknown>) || null,
        cooldown_seconds: trigger.cooldown_seconds,
        is_active: trigger.is_active,
      });
      setShowConditions(!!trigger.condition && Object.keys(trigger.condition).length > 0);
    } else {
      setForm({
        server_id: serverId ?? null,
        name: "",
        description: "",
        event_type: "player_join",
        event_config: {},
        action_type: "rcon_command",
        action_config: {},
        condition: null,
        cooldown_seconds: 0,
        is_active: true,
      });
      setShowConditions(false);
    }
  }, [trigger, serverId, open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all duration-150";
  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };
  const labelCls = "block text-[11px] font-bold text-[#94a3b8] mb-1 uppercase tracking-wider";

  const needsThreshold = form.event_type === "player_count_above" || form.event_type === "player_count_below";
  const needsPattern = form.event_type === "chat_message";
  const needsCommand = form.action_type === "rcon_command";
  const needsMessage = form.action_type === "discord_webhook";
  const needsReason = form.action_type === "kick_player" || form.action_type === "ban_player";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#e2e8f0]">
            {trigger ? "Edit Trigger" : "Create Trigger"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md text-[#64748b] hover:text-[#e2e8f0] transition-colors" style={{ background: "transparent" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name + Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Welcome Message"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelCls}>Description (optional)</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Greet players on join"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className={labelCls}>When (Event)</label>
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value as TriggerEventType, event_config: {} })}
              className={inputCls}
              style={inputStyle}
            >
              {EVENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
            <p className="text-xs text-[#64748b] mt-1">{EVENT_TYPES.find((e) => e.value === form.event_type)?.description}</p>
          </div>

          {/* Event Config */}
          {needsThreshold && (
            <div>
              <label className={labelCls}>Player Count Threshold</label>
              <input
                type="number"
                min={0}
                value={(form.event_config.threshold as number) ?? ""}
                onChange={(e) => setForm({ ...form, event_config: { ...form.event_config, threshold: parseInt(e.target.value) || 0 } })}
                required
                placeholder="10"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          )}
          {needsPattern && (
            <div>
              <label className={labelCls}>Chat Pattern (regex)</label>
              <input
                value={(form.event_config.pattern as string) ?? ""}
                onChange={(e) => setForm({ ...form, event_config: { ...form.event_config, pattern: e.target.value } })}
                required
                placeholder="cheat|hack|exploit"
                className={inputCls}
                style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              />
              <p className="text-xs text-[#64748b] mt-1">Regex pattern to match against chat messages</p>
            </div>
          )}

          {/* Action Type */}
          <div>
            <label className={labelCls}>Do (Action)</label>
            <select
              value={form.action_type}
              onChange={(e) => setForm({ ...form, action_type: e.target.value as TriggerActionType, action_config: {} })}
              className={inputCls}
              style={inputStyle}
            >
              {ACTION_TYPES.map((at) => (
                <option key={at.value} value={at.value}>{at.label}</option>
              ))}
            </select>
            <p className="text-xs text-[#64748b] mt-1">{ACTION_TYPES.find((a) => a.value === form.action_type)?.description}</p>
          </div>

          {/* Action Config */}
          {needsCommand && (
            <div>
              <label className={labelCls}>RCON Command</label>
              <input
                value={(form.action_config.command as string) ?? ""}
                onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, command: e.target.value } })}
                required
                placeholder='servermsg "Welcome {player_name}!"'
                className={inputCls}
                style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              />
              <p className="text-xs text-[#64748b] mt-1">
                Variables: <code className="text-[#00d4aa]">{"{player_name}"}</code> <code className="text-[#00d4aa]">{"{server_name}"}</code> <code className="text-[#00d4aa]">{"{player_count}"}</code> <code className="text-[#00d4aa]">{"{message}"}</code>
              </p>
            </div>
          )}
          {needsMessage && (
            <div>
              <label className={labelCls}>Webhook Message</label>
              <input
                value={(form.action_config.message as string) ?? ""}
                onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, message: e.target.value } })}
                placeholder="Server is almost full! ({player_count} players)"
                className={inputCls}
                style={inputStyle}
              />
              <p className="text-xs text-[#64748b] mt-1">Leave blank for default message. Uses server's webhook config.</p>
            </div>
          )}
          {needsReason && (
            <div>
              <label className={labelCls}>Reason</label>
              <input
                value={(form.action_config.reason as string) ?? ""}
                onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, reason: e.target.value } })}
                placeholder="Automated action by trigger"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          )}

          {/* Cooldown */}
          <div>
            <label className={labelCls}>Cooldown (seconds)</label>
            <input
              type="number"
              min={0}
              value={form.cooldown_seconds}
              onChange={(e) => setForm({ ...form, cooldown_seconds: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className={inputCls}
              style={inputStyle}
            />
            <p className="text-xs text-[#64748b] mt-1">Minimum seconds between trigger fires (0 = no cooldown)</p>
          </div>

          {/* Conditions (advanced) */}
          <div>
            <button
              type="button"
              onClick={() => setShowConditions(!showConditions)}
              className="text-xs font-bold text-[#64748b] hover:text-[#e2e8f0] transition-colors uppercase tracking-wider"
            >
              {showConditions ? "▼" : "▶"} Advanced Conditions
            </button>
            {showConditions && (
              <div className="mt-3 space-y-3 rounded-xl p-4" style={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <label className={labelCls}>Player Name Pattern (regex)</label>
                  <input
                    value={(form.condition?.player_pattern as string) ?? ""}
                    onChange={(e) => setForm({
                      ...form,
                      condition: { ...form.condition, player_pattern: e.target.value || undefined },
                    })}
                    placeholder="^Admin.*"
                    className={inputCls}
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Time Range Start</label>
                    <input
                      type="time"
                      value={(form.condition?.time_range as Record<string, string>)?.start ?? ""}
                      onChange={(e) => {
                        const tr = (form.condition?.time_range as Record<string, string>) ?? {};
                        setForm({
                          ...form,
                          condition: {
                            ...form.condition,
                            time_range: e.target.value ? { ...tr, start: e.target.value } : undefined,
                          },
                        });
                      }}
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Time Range End</label>
                    <input
                      type="time"
                      value={(form.condition?.time_range as Record<string, string>)?.end ?? ""}
                      onChange={(e) => {
                        const tr = (form.condition?.time_range as Record<string, string>) ?? {};
                        setForm({
                          ...form,
                          condition: {
                            ...form.condition,
                            time_range: e.target.value ? { ...tr, end: e.target.value } : undefined,
                          },
                        });
                      }}
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-5 py-2.5 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 transition-all duration-150"
              style={{ background: "#00d4aa" }}
            >
              {saving ? "Saving..." : trigger ? "Update Trigger" : "Create Trigger"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#e2e8f0] transition-all duration-150"
              style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
