import client from "./client";
import type { GameCommandSchema } from "../types";

export const commandsApi = {
  getCommands: async (gameType: string): Promise<GameCommandSchema> => {
    const res = await client.get<GameCommandSchema>(
      `/games/${gameType}/commands`
    );
    return res.data;
  },
};
