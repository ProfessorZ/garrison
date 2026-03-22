import client from "./client";
import type {
  Server,
  ServerStatus,
  EnrichedPlayer,
  CreateServerRequest,
  UpdateServerRequest,
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

  getStatus: async (id: number, live = false): Promise<ServerStatus> => {
    const res = await client.get<ServerStatus>(`/servers/${id}/status${live ? "?live=true" : ""}`);
    return res.data;
  },

  getPlayers: async (id: number): Promise<{ players: EnrichedPlayer[] }> => {
    const res = await client.get<{ players: EnrichedPlayer[] }>(
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

  messagePlayer: async (id: number, playerName: string, message: string) => {
    const res = await client.post(
      `/servers/${id}/players/${encodeURIComponent(playerName)}/message`,
      { message }
    );
    return res.data;
  },

  teleportPlayer: async (id: number, playerName: string, x: number, y: number, z: number) => {
    const res = await client.post(
      `/servers/${id}/players/${encodeURIComponent(playerName)}/teleport`,
      { x, y, z }
    );
    return res.data;
  },

  giveItem: async (id: number, playerName: string, item: string, count: number = 1) => {
    const res = await client.post(
      `/servers/${id}/players/${encodeURIComponent(playerName)}/give`,
      { item, count }
    );
    return res.data;
  },

  getRoles: async (id: number): Promise<{ roles: string[] }> => {
    const res = await client.get<{ roles: string[] }>(`/servers/${id}/roles`);
    return res.data;
  },

  promotePlayer: async (id: number, playerName: string, role: string) => {
    const res = await client.post(
      `/servers/${id}/players/${encodeURIComponent(playerName)}/promote`,
      { role }
    );
    return res.data;
  },

  demotePlayer: async (id: number, playerName: string) => {
    const res = await client.post(
      `/servers/${id}/players/${encodeURIComponent(playerName)}/demote`
    );
    return res.data;
  },

  getMaps: async (id: number): Promise<string[]> => {
    const res = await client.get<string[]>(`/servers/${id}/maps`);
    return res.data;
  },

  changeMap: async (id: number, mapName: string) => {
    const res = await client.post(`/servers/${id}/change-map`, { map_name: mapName });
    return res.data;
  },
};
