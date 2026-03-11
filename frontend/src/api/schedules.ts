import client from "./client";
import type { ScheduledCommand, SchedulePreset } from "../types";

export const schedulesApi = {
  list: async (serverId: number): Promise<ScheduledCommand[]> => {
    const res = await client.get<ScheduledCommand[]>(
      `/servers/${serverId}/schedules`
    );
    return res.data;
  },

  create: async (
    serverId: number,
    data: { name: string; command: string; cron_expression: string; is_active?: boolean }
  ): Promise<ScheduledCommand> => {
    const res = await client.post<ScheduledCommand>(
      `/servers/${serverId}/schedules`,
      data
    );
    return res.data;
  },

  update: async (
    serverId: number,
    scheduleId: number,
    data: Partial<Pick<ScheduledCommand, "name" | "command" | "cron_expression" | "is_active">>
  ): Promise<ScheduledCommand> => {
    const res = await client.put<ScheduledCommand>(
      `/servers/${serverId}/schedules/${scheduleId}`,
      data
    );
    return res.data;
  },

  delete: async (serverId: number, scheduleId: number): Promise<void> => {
    await client.delete(`/servers/${serverId}/schedules/${scheduleId}`);
  },

  getPresets: async (serverId: number): Promise<SchedulePreset[]> => {
    const res = await client.get<SchedulePreset[]>(
      `/servers/${serverId}/schedules/presets`
    );
    return res.data;
  },

  applyPreset: async (
    serverId: number,
    presetIndex: number
  ): Promise<ScheduledCommand[]> => {
    const res = await client.post<ScheduledCommand[]>(
      `/servers/${serverId}/schedules/presets/${presetIndex}`
    );
    return res.data;
  },
};
