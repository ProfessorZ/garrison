export interface User {
  id: number;
  username: string;
  is_admin: boolean;
}

export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  rcon_port: number;
  game_type: string;
}

export interface ServerStatus {
  online: boolean;
  player_count: number | null;
}

export interface Player {
  name: string;
  connected_at?: string;
}

export interface UpdateServerRequest {
  name?: string;
  host?: string;
  port?: number;
  rcon_port?: number;
  rcon_password?: string;
  game_type?: string;
}

export interface ConsoleLine {
  id: number;
  timestamp: Date;
  type: "command" | "output" | "error" | "system";
  text: string;
}

export interface ScheduledCommand {
  id: number;
  server_id: number;
  name: string;
  command: string;
  cron_expression: string;
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface CreateServerRequest {
  name: string;
  host: string;
  port: number;
  rcon_port: number;
  rcon_password: string;
  game_type: string;
}
