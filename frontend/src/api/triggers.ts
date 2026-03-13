import client from "./client";
import type { Trigger } from "../types";

export interface TriggerCreateData {
  server_id?: number | null;
  name: string;
  description?: string;
  event_type: string;
  event_config?: Record<string, unknown>;
  action_type: string;
  action_config?: Record<string, unknown>;
  condition?: Record<string, unknown> | null;
  cooldown_seconds?: number;
  is_active?: boolean;
}

export interface TriggerUpdateData {
  name?: string;
  description?: string;
  event_type?: string;
  event_config?: Record<string, unknown>;
  action_type?: string;
  action_config?: Record<string, unknown>;
  condition?: Record<string, unknown> | null;
  cooldown_seconds?: number;
  is_active?: boolean;
}

export const triggersApi = {
  list: async (serverId?: number): Promise<Trigger[]> => {
    const params = serverId ? { server_id: serverId } : {};
    const res = await client.get<Trigger[]>("/triggers", { params });
    return res.data;
  },

  listForServer: async (serverId: number): Promise<Trigger[]> => {
    const res = await client.get<Trigger[]>(`/servers/${serverId}/triggers`);
    return res.data;
  },

  create: async (data: TriggerCreateData): Promise<Trigger> => {
    const res = await client.post<Trigger>("/triggers", data);
    return res.data;
  },

  update: async (triggerId: number, data: TriggerUpdateData): Promise<Trigger> => {
    const res = await client.put<Trigger>(`/triggers/${triggerId}`, data);
    return res.data;
  },

  delete: async (triggerId: number): Promise<void> => {
    await client.delete(`/triggers/${triggerId}`);
  },

  toggle: async (triggerId: number): Promise<Trigger> => {
    const res = await client.post<Trigger>(`/triggers/${triggerId}/toggle`);
    return res.data;
  },

  test: async (triggerId: number): Promise<{ status: string; result: string }> => {
    const res = await client.post<{ status: string; result: string }>(`/triggers/${triggerId}/test`);
    return res.data;
  },
};
