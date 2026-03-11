import client from "./client";
import type { User } from "../types";

export const usersApi = {
  list: async (): Promise<User[]> => {
    const res = await client.get<User[]>("/users");
    return res.data;
  },

  setRole: async (userId: number, role: string): Promise<User> => {
    const res = await client.post<User>(`/users/${userId}/role`, { role });
    return res.data;
  },
};
