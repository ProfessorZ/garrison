import client from "./client";
import type {
  Server,
  ServerStatus,
  Player,
  CreateServerRequest,
  UpdateServerRequest,
  ScheduledCommand,
} from "../types";

export const serversApi = {
  list: async (): Promise<Server[]> => {
    const res = await client.get<Server[]>("/servers/");
    return res.data;
  },

  get: async (id: number): Promise<Server> => {
    const res = await client.get<Server>(`/servers/${id}`);
    return res.data;
  },

  create: async (data: CreateServerRequest): Promise<Server> => {
    const res = await client.post<Server>("/servers/", data);
    return res.data;
  },

  update: async (id: number, data: UpdateServerRequest): Promise<Server> => {
    const res = await client.put<Server>(`/servers/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/servers/${id}`);
  },

  getStatus: async (id: number): Promise<ServerStatus> => {
    const res = await client.get<ServerStatus>(`/servers/${id}/status`);
    return res.data;
  },

  getPlayers: async (id: number): Promise<{ players: Player[] }> => {
    const res = await client.get<{ players: Player[] }>(
      `/servers/${id}/players`
    );
    return res.data;
  },

  kickPlayer: async (id: number, playerName: string): Promise<void> => {
    await client.post(
      `/servers/${id}/players/${encodeURIComponent(playerName)}/kick`
    );
  },

  banPlayer: async (id: number, playerName: string): Promise<void> => {
    await client.post(
      `/servers/${id}/players/${encodeURIComponent(playerName)}/ban`
    );
  },

  getChat: async (id: number): Promise<{ messages: string[] }> => {
    const res = await client.get<{ messages: string[] }>(
      `/servers/${id}/chat`
    );
    return res.data;
  },
};

export const schedulerApi = {
  list: async (): Promise<ScheduledCommand[]> => {
    const res = await client.get<ScheduledCommand[]>("/scheduled-commands/");
    return res.data;
  },

  create: async (
    data: Omit<ScheduledCommand, "id" | "is_active">
  ): Promise<ScheduledCommand> => {
    const res = await client.post<ScheduledCommand>(
      "/scheduled-commands/",
      data
    );
    return res.data;
  },

  update: async (
    id: number,
    data: Partial<ScheduledCommand>
  ): Promise<ScheduledCommand> => {
    const res = await client.put<ScheduledCommand>(
      `/scheduled-commands/${id}`,
      data
    );
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/scheduled-commands/${id}`);
  },
};
