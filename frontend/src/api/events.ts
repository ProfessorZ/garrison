import client from "./client";
import type { GameEvent, PlayerKDStats } from "../types";

export const eventsApi = {
  getEvents: async (
    serverId: number,
    type: string = "all",
    limit: number = 50,
    offset: number = 0
  ): Promise<GameEvent[]> => {
    const res = await client.get<GameEvent[]>(
      `/servers/${serverId}/events`,
      { params: { type, limit, offset } }
    );
    return res.data;
  },

  getKillStats: async (
    serverId: number,
    limit: number = 25
  ): Promise<PlayerKDStats[]> => {
    const res = await client.get<PlayerKDStats[]>(
      `/servers/${serverId}/events/stats`,
      { params: { limit } }
    );
    return res.data;
  },

  getPlayerCombatStats: async (
    playerId: string
  ): Promise<{ player_id: string; kills: number; deaths: number; teamkills: number }> => {
    const res = await client.get(`/players/${playerId}/combat-stats`);
    return res.data;
  },
};
