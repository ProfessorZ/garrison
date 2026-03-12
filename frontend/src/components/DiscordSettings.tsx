import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Send, Check, X, Bell, BellOff } from "lucide-react";
import {
  discordApi,
  ALL_EVENTS,
  EVENT_LABELS,
  type Webhook,
  type WebhookCreate,
} from "../api/discord";

interface Props {
  serverId?: number;
}

export default function DiscordSettings({ serverId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = serverId
    ? ["webhooks", "server", serverId]
    : ["webhooks"];

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      serverId
        ? discordApi.listServerWebhooks(serverId)
        : discordApi.listWebhooks(),
  });

  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#00d4aa] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">
          Discord Webhooks
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0a0e1a] transition-all"
          style={{ background: "#00d4aa" }}
        >
          <Plus className="h-3 w-3" />
          Add Webhook
        </button>
      </div>

      {showForm && (
        <WebhookForm
          serverId={serverId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey });
          }}
        />
      )}

      {webhooks.length === 0 && !showForm && (
        <p className="text-sm text-[#64748b]">
          No webhooks configured. Add one to receive Discord notifications.
        </p>
      )}

      <div className="space-y-3 mt-4">
        {webhooks.map((wh) => (
          <WebhookCard
            key={wh.id}
            webhook={wh}
            onChanged={() => queryClient.invalidateQueries({ queryKey })}
          />
        ))}
      </div>
    </div>
  );
}

function WebhookForm({
  serverId,
  onClose,
  onCreated,
}: {
  serverId?: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([...ALL_EVENTS]);

  const createMutation = useMutation({
    mutationFn: (data: WebhookCreate) => discordApi.createWebhook(data),
    onSuccess: onCreated,
  });

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      server_id: serverId ?? null,
      webhook_url: url,
      events,
      is_active: true,
    });
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none transition-all";
  const inputStyle = { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg p-4 mb-4" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
          Webhook URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://discord.com/api/webhooks/..."
          className={inputCls}
          style={inputStyle}
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
          Events
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_EVENTS.map((event) => (
            <label
              key={event}
              className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            >
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={() => toggleEvent(event)}
                className="rounded border-[#64748b] accent-[#00d4aa]"
              />
              {EVENT_LABELS[event]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={createMutation.isPending || !url}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#0a0e1a] disabled:opacity-50 transition-all"
          style={{ background: "#00d4aa" }}
        >
          {createMutation.isPending ? "Creating..." : "Create Webhook"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[#94a3b8] hover:text-[#e2e8f0] transition-all"
          style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Cancel
        </button>
        {createMutation.isError && (
          <span className="text-xs text-[#ff4757]">Failed to create webhook.</span>
        )}
      </div>
    </form>
  );
}

function WebhookCard({
  webhook,
  onChanged,
}: {
  webhook: Webhook;
  onChanged: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  const toggleMutation = useMutation({
    mutationFn: () =>
      discordApi.updateWebhook(webhook.id, { is_active: !webhook.is_active }),
    onSuccess: onChanged,
  });

  const deleteMutation = useMutation({
    mutationFn: () => discordApi.deleteWebhook(webhook.id),
    onSuccess: onChanged,
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await discordApi.testWebhook(webhook.id);
      setTestResult("ok");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const scope = webhook.server_name
    ? webhook.server_name
    : "Global (all servers)";

  return (
    <div
      className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: webhook.is_active ? 1 : 0.5,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {webhook.is_active ? (
            <Bell className="h-3.5 w-3.5 text-[#00d4aa] shrink-0" />
          ) : (
            <BellOff className="h-3.5 w-3.5 text-[#64748b] shrink-0" />
          )}
          <span className="text-sm font-semibold text-[#e2e8f0] truncate">
            {scope}
          </span>
          <span className="text-[10px] font-mono text-[#64748b]">
            {webhook.webhook_url_preview}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {webhook.events.map((event) => (
            <span
              key={event}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-[#94a3b8]"
              style={{ background: "#1a1f2e" }}
            >
              {EVENT_LABELS[event] || event}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleTest}
          disabled={testing || !webhook.is_active}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#94a3b8] hover:text-[#e2e8f0] disabled:opacity-40 transition-all"
          style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
          title="Send test message"
        >
          {testing ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#00d4aa] border-r-transparent" />
          ) : testResult === "ok" ? (
            <Check className="h-3 w-3 text-[#00d4aa]" />
          ) : testResult === "fail" ? (
            <X className="h-3 w-3 text-[#ff4757]" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Test
        </button>

        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#94a3b8] hover:text-[#e2e8f0] disabled:opacity-40 transition-all"
          style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {webhook.is_active ? (
            <>
              <BellOff className="h-3 w-3" /> Disable
            </>
          ) : (
            <>
              <Bell className="h-3 w-3" /> Enable
            </>
          )}
        </button>

        <button
          onClick={() => {
            if (confirm("Delete this webhook?")) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#ff4757] hover:text-[#ff6b81] disabled:opacity-40 transition-all"
          style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.06)" }}
          title="Delete webhook"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
