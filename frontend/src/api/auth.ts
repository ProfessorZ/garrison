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
};
