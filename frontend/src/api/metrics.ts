import client from "./client";
import type { MetricPoint, MetricsSummary, DashboardMetrics, ServerHeuristics } from "../types";

export const metricsApi = {
  getServerMetrics: async (serverId: number, period: string = "24h"): Promise<MetricPoint[]> => {
    const res = await client.get<MetricPoint[]>(`/servers/${serverId}/metrics`, { params: { period } });
    return res.data;
  },

  getMetricsSummary: async (serverId: number): Promise<MetricsSummary> => {
    const res = await client.get<MetricsSummary>(`/servers/${serverId}/metrics/summary`);
    return res.data;
  },

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const res = await client.get<DashboardMetrics>("/dashboard/metrics");
    return res.data;
  },

  getHeuristics: async (serverId: number): Promise<ServerHeuristics> => {
    const res = await client.get<ServerHeuristics>(`/servers/${serverId}/heuristics`);
    return res.data;
  },
};
