import client from "./client";
import type { AuthResponse, LoginRequest, User } from "../types";

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await client.post<AuthResponse>("/auth/login", data);
    return res.data;
  },

  register: async (data: LoginRequest): Promise<void> => {
    await client.post("/auth/register", data);
  },

  getMe: async (): Promise<User> => {
    const res = await client.get<User>("/auth/me");
    return res.data;
  },

  linkDiscord: async (discord_id: string): Promise<User> => {
    const res = await client.put<User>("/auth/discord-link", { discord_id });
    return res.data;
  },

  unlinkDiscord: async (): Promise<User> => {
    const res = await client.delete<User>("/auth/discord-link");
    return res.data;
  },
};
