import client from "./client";
import type { DashboardStats } from "../types";

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await client.get<DashboardStats>("/dashboard/stats");
    return res.data;
  },
};
