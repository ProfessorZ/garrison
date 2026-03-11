import client from "./client";
import type { ServerPermission } from "../types";

export const permissionsApi = {
  list: async (serverId: number): Promise<ServerPermission[]> => {
    const res = await client.get<ServerPermission[]>(
      `/servers/${serverId}/permissions`
    );
    return res.data;
  },

  grant: async (
    serverId: number,
    userId: number,
    role: string
  ): Promise<ServerPermission> => {
    const res = await client.post<ServerPermission>(
      `/servers/${serverId}/permissions`,
      { user_id: userId, role }
    );
    return res.data;
  },

  revoke: async (serverId: number, userId: number): Promise<void> => {
    await client.delete(`/servers/${serverId}/permissions/${userId}`);
  },
};
