import client from "./client";
import type { ActivityFilters, PaginatedActivity, ActivityEntry } from "../types";

export const activityApi = {
  getActivity: async (filters?: ActivityFilters): Promise<PaginatedActivity> => {
    const params: Record<string, string | number> = {};
    if (filters?.server_id) params.server_id = filters.server_id;
    if (filters?.user) params.user = filters.user;
    if (filters?.action) params.action = filters.action;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;
    if (filters?.page) params.offset = ((filters.page - 1) * (filters.per_page ?? 20));
    if (filters?.per_page) params.limit = filters.per_page;
    const res = await client.get<ActivityEntry[]>("/activity", { params });
    return { items: res.data, total: res.data.length };
  },

  getServerActivity: async (
    serverId: number,
    page = 1,
    perPage = 20
  ): Promise<PaginatedActivity> => {
    const res = await client.get<ActivityEntry[]>(
      `/servers/${serverId}/activity`,
      { params: { limit: perPage, offset: (page - 1) * perPage } }
    );
    return { items: res.data, total: res.data.length };
  },
};
