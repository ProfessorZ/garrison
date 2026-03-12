import client from "./client";
import type {
  KnownPlayerList,
  PlayerProfile,
  PlayerSessionList,
  PlayerBan,
} from "../types";

export const knownPlayersApi = {
  list: async (params: {
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_dir?: string;
    status?: string;
    server_id?: number;
  } = {}): Promise<KnownPlayerList> => {
    const res = await client.get<KnownPlayerList>("/players", { params });
    return res.data;
  },

  search: async (q: string, page = 1, per_page = 25): Promise<KnownPlayerList> => {
    const res = await client.get<KnownPlayerList>("/players/search", {
      params: { q, page, per_page },
    });
    return res.data;
  },

  getProfile: async (playerId: number): Promise<PlayerProfile> => {
    const res = await client.get<PlayerProfile>(`/players/${playerId}`);
    return res.data;
  },

  getSessions: async (
    playerId: number,
    page = 1,
    per_page = 25
  ): Promise<PlayerSessionList> => {
    const res = await client.get<PlayerSessionList>(
      `/players/${playerId}/sessions`,
      { params: { page, per_page } }
    );
    return res.data;
  },

  getBans: async (playerId: number): Promise<PlayerBan[]> => {
    const res = await client.get<PlayerBan[]>(`/players/${playerId}/bans`);
    return res.data;
  },

  updateNotes: async (playerId: number, notes: string): Promise<void> => {
    await client.put(`/players/${playerId}/notes`, { notes });
  },

  ban: async (
    playerId: number,
    data: { reason?: string; expires_at?: string; server_id?: number }
  ): Promise<void> => {
    await client.post(`/players/${playerId}/ban`, data);
  },

  unban: async (playerId: number): Promise<void> => {
    await client.post(`/players/${playerId}/unban`);
  },
};
