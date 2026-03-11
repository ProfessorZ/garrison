import client from "./client";
import type { ActivityFilters, PaginatedActivity } from "../types";

export const activityApi = {
  getActivity: async (filters?: ActivityFilters): Promise<PaginatedActivity> => {
    const params: Record<string, string | number> = {};
    if (filters?.server_id) params.server_id = filters.server_id;
    if (filters?.user) params.user = filters.user;
    if (filters?.action) params.action = filters.action;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;
    if (filters?.page) params.page = filters.page;
    if (filters?.per_page) params.per_page = filters.per_page;
    const res = await client.get<PaginatedActivity>("/activity/", { params });
    return res.data;
  },

  getServerActivity: async (
    serverId: number,
    page = 1,
    perPage = 20
  ): Promise<PaginatedActivity> => {
    const res = await client.get<PaginatedActivity>(
      `/servers/${serverId}/activity`,
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },
};
