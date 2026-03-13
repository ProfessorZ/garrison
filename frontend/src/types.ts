export type UserRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIEWER";

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  role: UserRole;
  discord_id?: string | null;
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

// Enriched player from server endpoint
export interface EnrichedPlayer {
  name: string;
  connected_at?: string;
  known_player_id?: number;
  total_playtime_seconds?: number;
  session_count?: number;
  is_banned?: boolean;
  first_seen?: string;
  first_seen_on_server?: string;
  total_time_on_server?: number;
  sessions_on_server?: number;
}

// Known player database
export interface KnownPlayer {
  id: number;
  name: string;
  first_seen?: string;
  last_seen?: string;
  total_playtime_seconds: number;
  session_count: number;
  is_banned: boolean;
  ban_count: number;
  notes?: string;
  is_online: boolean;
  current_server_id?: number;
  current_server_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnownPlayerList {
  items: KnownPlayer[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface PlayerSession {
  id: number;
  player_id: number;
  server_id: number;
  server_name?: string;
  joined_at?: string;
  left_at?: string;
  duration_seconds?: number;
}

export interface PlayerSessionList {
  items: PlayerSession[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface PlayerBan {
  id: number;
  player_id: number;
  server_id?: number;
  server_name?: string;
  banned_by_user_id?: number;
  banned_by_username?: string;
  reason?: string;
  banned_at?: string;
  expires_at?: string;
  is_active: boolean;
  unbanned_at?: string;
  unbanned_by_user_id?: number;
  unbanned_by_username?: string;
}

export interface PlayerNameHistory {
  id: number;
  player_id: number;
  name: string;
  first_seen_with_name?: string;
  last_seen_with_name?: string;
}

export interface PlayerProfile {
  player: KnownPlayer;
  sessions: PlayerSession[];
  bans: PlayerBan[];
  name_history: PlayerNameHistory[];
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
  known_players: number;
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
