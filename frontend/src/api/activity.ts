import client from "./client";
import type { ActivityFilters, PaginatedActivity, ActivityEntry } from "../types";

export const activityApi = {
  getActivity: async (filters?: ActivityFilters): Promise<PaginatedActivity> => {
    const perPage = filters?.per_page ?? 20;
    const page = filters?.page ?? 1;
    const params: Record<string, string | number> = {
      limit: perPage,
      offset: (page - 1) * perPage,
    };
    if (filters?.server_id) params.server_id = filters.server_id;
    if (filters?.action) params.action = filters.action;
    // Backend accepts user_id (numeric), not username string
    if (filters?.user && /^\d+$/.test(filters.user)) {
      params.user_id = Number(filters.user);
    }
    const res = await client.get<ActivityEntry[]>("/activity", { params });
    const items = res.data ?? [];
    // If we got a full page, assume there may be more
    const total =
      items.length < perPage
        ? (page - 1) * perPage + items.length
        : page * perPage + 1;
    return { items, total };
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
    const items = res.data ?? [];
    const total =
      items.length < perPage
        ? (page - 1) * perPage + items.length
        : page * perPage + 1;
    return { items, total };
  },
};
