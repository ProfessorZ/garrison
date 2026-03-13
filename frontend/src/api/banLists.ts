import client from "./client";
import type {
  BanList,
  BanListDetail,
  BanListEntry,
  BanListEntryList,
  ServerBanList,
} from "../types";

export const banListsApi = {
  list: async (): Promise<BanList[]> => {
    const res = await client.get<BanList[]>("/ban-lists");
    return res.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    is_global?: boolean;
  }): Promise<BanList> => {
    const res = await client.post<BanList>("/ban-lists", data);
    return res.data;
  },

  get: async (id: number): Promise<BanListDetail> => {
    const res = await client.get<BanListDetail>(`/ban-lists/${id}`);
    return res.data;
  },

  update: async (
    id: number,
    data: { name?: string; description?: string; is_global?: boolean }
  ): Promise<BanList> => {
    const res = await client.put<BanList>(`/ban-lists/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/ban-lists/${id}`);
  },

  // Entries
  listEntries: async (
    id: number,
    params: { page?: number; per_page?: number; search?: string } = {}
  ): Promise<BanListEntryList> => {
    const res = await client.get<BanListEntryList>(`/ban-lists/${id}/entries`, {
      params,
    });
    return res.data;
  },

  addEntry: async (
    id: number,
    data: {
      player_name: string;
      player_id?: number;
      reason?: string;
      expires_at?: string;
    }
  ): Promise<BanListEntry> => {
    const res = await client.post<BanListEntry>(
      `/ban-lists/${id}/entries`,
      data
    );
    return res.data;
  },

  removeEntry: async (banListId: number, entryId: number): Promise<void> => {
    await client.delete(`/ban-lists/${banListId}/entries/${entryId}`);
  },

  // Servers
  listServers: async (id: number): Promise<ServerBanList[]> => {
    const res = await client.get<ServerBanList[]>(`/ban-lists/${id}/servers`);
    return res.data;
  },

  assignServer: async (
    id: number,
    data: { server_id: number; auto_enforce?: boolean }
  ): Promise<ServerBanList> => {
    const res = await client.post<ServerBanList>(
      `/ban-lists/${id}/servers`,
      data
    );
    return res.data;
  },

  unassignServer: async (
    banListId: number,
    serverId: number
  ): Promise<void> => {
    await client.delete(`/ban-lists/${banListId}/servers/${serverId}`);
  },

  // Sync + Import/Export
  syncToServer: async (
    banListId: number,
    serverId: number
  ): Promise<{ synced: number }> => {
    const res = await client.post<{ synced: number }>(
      `/ban-lists/${banListId}/sync/${serverId}`
    );
    return res.data;
  },

  importFromServer: async (
    banListId: number,
    serverId: number
  ): Promise<{ imported: number }> => {
    const res = await client.post<{ imported: number }>(
      `/ban-lists/${banListId}/import/${serverId}`
    );
    return res.data;
  },

  exportCsv: async (banListId: number): Promise<string> => {
    const res = await client.get<string>(
      `/ban-lists/${banListId}/export.csv`,
      { responseType: "text" as any }
    );
    return res.data;
  },

  importCsv: async (
    banListId: number,
    file: File
  ): Promise<{ imported: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await client.post<{ imported: number }>(
      `/ban-lists/${banListId}/import-csv`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },
};
