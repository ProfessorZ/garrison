export type UserRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIEWER";

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  role: UserRole;
  created_at?: string;
}

export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  rcon_port: number;
  game_type: string;
  last_status?: string | null;
  last_checked?: string | null;
  player_count?: number | null;
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
  last_run: string | null;
  next_run: string | null;
  run_count: number;
  last_result: string | null;
  created_at: string | null;
}

export interface SchedulePresetCommand {
  name: string;
  command: string;
  cron_expression: string;
}

export interface SchedulePreset {
  name: string;
  description: string;
  commands: SchedulePresetCommand[];
}

export interface ServerOption {
  name: string;
  value: string;
  type: "boolean" | "number" | "string";
  category: string;
  description: string;
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

// Activity
export type ActivityAction =
  | "rcon_command"
  | "kick"
  | "ban"
  | "server_start"
  | "server_stop"
  | "server_add"
  | "server_update"
  | "server_delete"
  | "scheduler_create"
  | "scheduler_update";

export interface ActivityEntry {
  id: number;
  user: string;
  action: ActivityAction;
  description: string;
  server_name?: string;
  server_id?: number;
  created_at: string;
}

export interface ActivityFilters {
  server_id?: number;
  user?: string;
  action?: ActivityAction;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedActivity {
  items: ActivityEntry[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Chat
export interface ChatMessage {
  id: number;
  player_name: string;
  message: string;
  is_system: boolean;
  timestamp: string;
}

// Dashboard stats
export interface DashboardStats {
  total_servers: number;
  online_servers: number;
  total_players: number;
}

// Server permissions
export interface ServerPermission {
  id: number;
  user_id: number;
  server_id: number;
  role: string;
  username?: string;
  created_at?: string;
}

// Game commands (for autocomplete)
export interface CommandParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  enum_values?: string[];
}

export interface GameCommand {
  name: string;
  description: string;
  usage: string;
  category: string;
  parameters: CommandParam[];
}

export interface GameCommandSchema {
  game_name: string;
  schema_version: string;
  commands: GameCommand[];
}
