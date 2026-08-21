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
        <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#ffb224] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6" style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-[#e8e3d8] uppercase tracking-wider">
          Discord Webhooks
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0b0a08] transition-all"
          style={{ background: "#ffb224" }}
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
        <p className="text-sm text-[#6b6455]">
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

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e8e3d8] placeholder-[#6b6455] focus:outline-none transition-all";
  const inputStyle = { background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg p-4 mb-4" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-[#8a8271] mb-1.5 uppercase tracking-wider">
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
        <label className="block text-[11px] font-semibold text-[#8a8271] mb-2 uppercase tracking-wider">
          Events
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_EVENTS.map((event) => (
            <label
              key={event}
              className="flex items-center gap-2 cursor-pointer text-xs text-[#8a8271] hover:text-[#e8e3d8] transition-colors"
            >
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={() => toggleEvent(event)}
                className="rounded border-[#6b6455] accent-[#ffb224]"
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
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#0b0a08] disabled:opacity-50 transition-all"
          style={{ background: "#ffb224" }}
        >
          {createMutation.isPending ? "Creating..." : "Create Webhook"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[#8a8271] hover:text-[#e8e3d8] transition-all"
          style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Cancel
        </button>
        {createMutation.isError && (
          <span className="text-xs text-[#d96b5c]">Failed to create webhook.</span>
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
            <Bell className="h-3.5 w-3.5 text-[#ffb224] shrink-0" />
          ) : (
            <BellOff className="h-3.5 w-3.5 text-[#6b6455] shrink-0" />
          )}
          <span className="text-sm font-semibold text-[#e8e3d8] truncate">
            {scope}
          </span>
          <span className="text-[10px] font-mono text-[#6b6455]">
            {webhook.webhook_url_preview}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {webhook.events.map((event) => (
            <span
              key={event}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-[#8a8271]"
              style={{ background: "#12100b" }}
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
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#8a8271] hover:text-[#e8e3d8] disabled:opacity-40 transition-all"
          style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
          title="Send test message"
        >
          {testing ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#ffb224] border-r-transparent" />
          ) : testResult === "ok" ? (
            <Check className="h-3 w-3 text-[#ffb224]" />
          ) : testResult === "fail" ? (
            <X className="h-3 w-3 text-[#d96b5c]" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Test
        </button>

        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#8a8271] hover:text-[#e8e3d8] disabled:opacity-40 transition-all"
          style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
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
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#d96b5c] hover:text-[#ff6b81] disabled:opacity-40 transition-all"
          style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
          title="Delete webhook"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
