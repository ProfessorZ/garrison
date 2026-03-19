import client from "./client";
import type { BanTemplate } from "../types";

export const banTemplatesApi = {
  list: async (): Promise<BanTemplate[]> => {
    const res = await client.get<BanTemplate[]>("/ban-templates");
    return res.data;
  },

  create: async (data: {
    name: string;
    reason_template: string;
    duration_hours?: number | null;
  }): Promise<BanTemplate> => {
    const res = await client.post<BanTemplate>("/ban-templates", data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/ban-templates/${id}`);
  },
};
