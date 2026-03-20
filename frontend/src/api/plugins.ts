import client from "./client";

export interface Plugin {
  id: string;
  name: string;
  display_name?: string;
  version: string;
  description?: string;
  author?: string;
  repo?: string;
  icon?: string;
  game_type?: string;
  status?: string;
  default_ports?: { game?: number; rcon?: number };
}

export interface PluginListResponse {
  plugins: Plugin[];
  errors: Record<string, string>;
}

export interface InstallResult {
  status: string;
  plugin: Plugin;
}

export const pluginsApi = {
  list: async (): Promise<PluginListResponse> => {
    const res = await client.get<PluginListResponse>("/plugins/");
    return res.data;
  },

  installFromGit: async (url: string): Promise<InstallResult> => {
    const res = await client.post<InstallResult>("/plugins/install", {
      url,
      acknowledged_risk: true,
    });
    return res.data;
  },

  installFromZip: async (file: File): Promise<InstallResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await client.post<InstallResult>("/plugins/install/zip", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uninstall: async (pluginId: string): Promise<{ status: string }> => {
    const res = await client.delete<{ status: string }>(`/plugins/${pluginId}`);
    return res.data;
  },

  update: async (pluginId: string): Promise<InstallResult> => {
    const res = await client.post<InstallResult>(`/plugins/${pluginId}/update`);
    return res.data;
  },
};
