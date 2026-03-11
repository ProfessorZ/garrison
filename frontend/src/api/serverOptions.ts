import client from "./client";
import type { ServerOption } from "../types";

export const serverOptionsApi = {
  list: async (serverId: number): Promise<ServerOption[]> => {
    const res = await client.get<ServerOption[]>(
      `/servers/${serverId}/options`
    );
    return res.data;
  },

  update: async (
    serverId: number,
    optionName: string,
    value: string
  ): Promise<ServerOption> => {
    const res = await client.put<ServerOption>(
      `/servers/${serverId}/options/${encodeURIComponent(optionName)}`,
      { value }
    );
    return res.data;
  },

  bulkUpdate: async (
    serverId: number,
    options: Record<string, string>
  ): Promise<ServerOption[]> => {
    const res = await client.put<ServerOption[]>(
      `/servers/${serverId}/options`,
      { options }
    );
    return res.data;
  },
};
