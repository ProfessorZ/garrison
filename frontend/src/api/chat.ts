import client from "./client";
import type { ChatMessage } from "../types";

export const chatApi = {
  getServerChat: async (serverId: number): Promise<ChatMessage[]> => {
    const res = await client.get<ChatMessage[]>(`/servers/${serverId}/chat/log`);
    return res.data;
  },
};
