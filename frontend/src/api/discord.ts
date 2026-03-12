import client from "./client";

export interface Webhook {
  id: number;
  server_id: number | null;
  server_name: string | null;
  webhook_url_preview: string;
  events: string[];
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface WebhookCreate {
  server_id?: number | null;
  webhook_url: string;
  events: string[];
  is_active: boolean;
}

export interface WebhookUpdate {
  webhook_url?: string;
  events?: string[];
  is_active?: boolean;
}

export interface BotStatus {
  connected: boolean;
  guild_name: string | null;
  command_count: number;
  bot_username: string | null;
}

export const ALL_EVENTS = [
  "server_online",
  "server_offline",
  "player_join",
  "player_leave",
  "player_kick",
  "player_ban",
  "scheduled_command",
  "server_error",
] as const;

export const EVENT_LABELS: Record<string, string> = {
  server_online: "Server Online",
  server_offline: "Server Offline",
  player_join: "Player Join",
  player_leave: "Player Leave",
  player_kick: "Player Kick",
  player_ban: "Player Ban",
  scheduled_command: "Scheduled Command",
  server_error: "Server Error",
};

export const discordApi = {
  listWebhooks: async (): Promise<Webhook[]> => {
    const res = await client.get<Webhook[]>("/webhooks");
    return res.data;
  },

  listServerWebhooks: async (serverId: number): Promise<Webhook[]> => {
    const res = await client.get<Webhook[]>(`/servers/${serverId}/webhooks`);
    return res.data;
  },

  createWebhook: async (data: WebhookCreate): Promise<Webhook> => {
    const res = await client.post<Webhook>("/webhooks", data);
    return res.data;
  },

  updateWebhook: async (id: number, data: WebhookUpdate): Promise<Webhook> => {
    const res = await client.put<Webhook>(`/webhooks/${id}`, data);
    return res.data;
  },

  deleteWebhook: async (id: number): Promise<void> => {
    await client.delete(`/webhooks/${id}`);
  },

  testWebhook: async (id: number): Promise<{ status: string; message: string }> => {
    const res = await client.post<{ status: string; message: string }>(
      `/webhooks/${id}/test`
    );
    return res.data;
  },

  getBotStatus: async (): Promise<BotStatus> => {
    const res = await client.get<BotStatus>("/discord/bot-status");
    return res.data;
  },
};
