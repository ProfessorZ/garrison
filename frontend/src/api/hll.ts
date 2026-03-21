import client from "./client";

export interface HLLMap {
  name: string;
  id?: string;
  gameMode?: string;
  pretty_name?: string;
}

export interface HLLPlayer {
  name: string;
  player_id: string;
  team?: string;
  faction?: string;
  role?: string;
  level?: number;
  kills?: number;
  deaths?: number;
  score?: number;
}

export interface HLLSettings {
  autobalance_enabled?: boolean;
  autobalance_threshold?: number;
  team_switch_cooldown?: number;
  idle_kick_minutes?: number;
  max_ping?: number;
  vote_kick_enabled?: boolean;
  max_queue_length?: number;
  vip_slots?: number;
  map_shuffle?: boolean;
  [key: string]: unknown;
}

export interface HLLVip {
  player_id: string;
  name?: string;
  comment?: string;
}

export const hllApi = {
  // Map rotation
  getMapRotation: async (serverId: number) => {
    const res = await client.get(`/servers/${serverId}/hll/map-rotation`);
    return res.data;
  },
  addMapToRotation: async (serverId: number, map_name: string, game_mode?: string) => {
    const res = await client.post(`/servers/${serverId}/hll/map-rotation`, { map_name, game_mode });
    return res.data;
  },
  removeMapFromRotation: async (serverId: number, map_name: string) => {
    const res = await client.delete(`/servers/${serverId}/hll/map-rotation/${encodeURIComponent(map_name)}`);
    return res.data;
  },

  // Map sequence
  getMapSequence: async (serverId: number) => {
    const res = await client.get(`/servers/${serverId}/hll/map-sequence`);
    return res.data;
  },

  // Change map
  changeMap: async (serverId: number, map_name: string) => {
    const res = await client.post(`/servers/${serverId}/hll/change-map`, { map_name });
    return res.data;
  },

  // Available maps
  getAvailableMaps: async (serverId: number): Promise<{ maps: HLLMap[] }> => {
    const res = await client.get<{ maps: HLLMap[] }>(`/servers/${serverId}/hll/available-maps`);
    return res.data;
  },

  // Settings
  getSettings: async (serverId: number): Promise<HLLSettings> => {
    const res = await client.get<HLLSettings>(`/servers/${serverId}/hll/settings`);
    return res.data;
  },
  updateSettings: async (serverId: number, settings: Partial<HLLSettings>) => {
    const res = await client.post(`/servers/${serverId}/hll/settings`, settings);
    return res.data;
  },

  // Broadcast
  broadcast: async (serverId: number, message: string) => {
    const res = await client.post(`/servers/${serverId}/hll/broadcast`, { message });
    return res.data;
  },

  // Player actions
  kickPlayer: async (serverId: number, playerId: string, reason: string) => {
    const res = await client.post(`/servers/${serverId}/hll/players/${encodeURIComponent(playerId)}/kick`, { reason });
    return res.data;
  },
  punishPlayer: async (serverId: number, playerId: string, reason: string) => {
    const res = await client.post(`/servers/${serverId}/hll/players/${encodeURIComponent(playerId)}/punish`, { reason });
    return res.data;
  },
  tempBanPlayer: async (serverId: number, playerId: string, duration_hours: number, reason: string) => {
    const res = await client.post(`/servers/${serverId}/hll/players/${encodeURIComponent(playerId)}/temp-ban`, { duration_hours, reason });
    return res.data;
  },
  permBanPlayer: async (serverId: number, playerId: string, reason: string) => {
    const res = await client.post(`/servers/${serverId}/hll/players/${encodeURIComponent(playerId)}/perm-ban`, { reason });
    return res.data;
  },
  messagePlayer: async (serverId: number, playerId: string, message: string) => {
    const res = await client.post(`/servers/${serverId}/hll/players/${encodeURIComponent(playerId)}/message`, { message });
    return res.data;
  },
  switchTeam: async (serverId: number, playerId: string, force: boolean) => {
    const res = await client.post(`/servers/${serverId}/hll/players/${encodeURIComponent(playerId)}/switch-team`, { force });
    return res.data;
  },

  // VIPs
  getVips: async (serverId: number) => {
    const res = await client.get(`/servers/${serverId}/hll/vips`);
    return res.data;
  },
  addVip: async (serverId: number, player_id: string, comment: string) => {
    const res = await client.post(`/servers/${serverId}/hll/vips`, { player_id, comment });
    return res.data;
  },
  removeVip: async (serverId: number, player_id: string) => {
    const res = await client.delete(`/servers/${serverId}/hll/vips/${encodeURIComponent(player_id)}`);
    return res.data;
  },
};
