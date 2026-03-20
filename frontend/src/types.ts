export type UserRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIEWER";

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  role: UserRole;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_avatar?: string | null;
  created_at?: string;
}

export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  query_port?: number | null;
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
  // Steam fields
  steam_id?: string | null;
  vac_banned?: boolean;
  vac_ban_count?: number;
  days_since_last_ban?: number;
  game_banned?: boolean;
  steam_profile_visibility?: number;
  steam_avatar_url?: string | null;
  steam_persona_name?: string | null;
  alt_account_ids?: number[];
  steam_checked_at?: string | null;
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
  query_port?: number | null;
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
  query_port?: number | null;
  rcon_port: number;
  rcon_password: string;
  game_type: string;
}

// Activity
export type ActivityAction =
  | "COMMAND"
  | "KICK"
  | "BAN"
  | "UNBAN"
  | "SERVER_CREATE"
  | "SERVER_UPDATE"
  | "SERVER_DELETE"
  | "LOGIN"
  | "SCHEDULER_CREATE"
  | "SCHEDULER_UPDATE"
  | "SCHEDULER_DELETE"
  | "DISCORD_COMMAND"
  | string;

export interface ActivityEntry {
  id: number;
  user_id?: number;
  username?: string;
  action: ActivityAction;
  detail: string;
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
  page?: number;
  per_page?: number;
  pages?: number;
}

// Chat
export interface ChatMessage {
  id: number;
  player_name: string;
  message: string;
  is_system: boolean;
  timestamp: string;
}

// Game Events
export interface GameEvent {
  id: number;
  server_id: number;
  event_type: string;
  timestamp: string;
  player_name?: string | null;
  player_id?: string | null;
  target_name?: string | null;
  target_id?: string | null;
  message?: string | null;
  weapon?: string | null;
}

export interface PlayerKDStats {
  player_id: string;
  player_name: string;
  kills: number;
  deaths: number;
  teamkills: number;
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

// Ban Lists
export interface BanList {
  id: number;
  name: string;
  description?: string;
  is_global: boolean;
  created_by_user_id?: number;
  created_by_username?: string;
  entry_count: number;
  server_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface BanListDetail extends BanList {
  servers: ServerBanList[];
}

export interface BanListEntry {
  id: number;
  ban_list_id: number;
  player_id?: number;
  player_name: string;
  reason?: string;
  added_by_user_id?: number;
  added_by_username?: string;
  expires_at?: string;
  is_active: boolean;
  added_at?: string;
  updated_at?: string;
}

export interface BanListEntryList {
  items: BanListEntry[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ServerBanList {
  server_id: number;
  server_name?: string;
  ban_list_id: number;
  auto_enforce: boolean;
  added_at?: string;
}

// Player Notes
export interface PlayerNote {
  id: number;
  player_id: number;
  author_id?: number;
  author_username?: string;
  text: string;
  created_at?: string;
}

// Alt Accounts
export interface AltAccount {
  id: number;
  name: string;
  first_seen?: string;
  last_seen?: string;
  is_banned: boolean;
  session_count: number;
  shared_ips: string[];
}

// Ban Templates
export interface BanTemplate {
  id: number;
  name: string;
  reason_template: string;
  duration_hours?: number | null;
  created_by_user_id?: number;
  created_by_username?: string;
  created_at?: string;
}

// Metrics
export interface MetricPoint {
  timestamp: string;
  player_count: number;
  is_online: boolean;
  response_time_ms?: number | null;
}

export interface MetricsSummary {
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
  peak_players_24h: number;
  peak_players_7d: number;
  peak_players_30d: number;
  avg_players_24h: number;
  avg_players_7d: number;
  avg_players_30d: number;
  current_streak_hours: number;
}

export interface DashboardMetrics {
  total_player_hours_24h: number;
  combined_uptime_percent: number;
}

export interface ServerHeuristics {
  peak_hours: number[];
  trend: "growing" | "declining" | "stable";
  trend_percent: number;
  uptime_7d: number;
  median_players: number;
  is_healthy: boolean;
}

// Triggers
export type TriggerEventType =
  | "player_join"
  | "player_leave"
  | "player_count_above"
  | "player_count_below"
  | "server_online"
  | "server_offline"
  | "chat_message";

export type TriggerActionType =
  | "rcon_command"
  | "discord_webhook"
  | "kick_player"
  | "ban_player";

export interface Trigger {
  id: number;
  server_id?: number | null;
  server_name?: string | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  event_type: TriggerEventType;
  event_config?: Record<string, unknown> | null;
  action_type: TriggerActionType;
  action_config?: Record<string, unknown> | null;
  condition?: Record<string, unknown> | null;
  cooldown_seconds: number;
  last_fired_at?: string | null;
  fire_count: number;
  created_by_user_id?: number | null;
  created_by_username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
