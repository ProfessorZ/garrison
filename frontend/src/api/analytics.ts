import client from "./client";

export interface KillStats {
  period: string;
  total_kills: number;
  total_teamkills: number;
  top_killers: { name: string; kills: number }[];
  top_weapons: { weapon: string; kills: number }[];
  most_killed: { name: string; deaths: number }[];
  teamkillers: { name: string; teamkills: number }[];
}

export interface MapStats {
  period: string;
  maps_played: { map: string; times_played: number }[];
}

export const analyticsApi = {
  getKillStats: async (serverId: number, period = "7d"): Promise<KillStats> => {
    const res = await client.get(`/servers/${serverId}/analytics/kills`, { params: { period } });
    return res.data;
  },
  getMapStats: async (serverId: number, period = "7d"): Promise<MapStats> => {
    const res = await client.get(`/servers/${serverId}/analytics/maps`, { params: { period } });
    return res.data;
  },
};
