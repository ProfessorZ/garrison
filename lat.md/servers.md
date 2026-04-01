# Server Management

Servers are the central entity in Garrison. Each [[backend/app/models/server.py#Server]] record stores connection details (host, port, game type) and an encrypted RCON password.

## Server CRUD

[[backend/app/api/servers.py]] exposes endpoints for creating, updating, deleting, and listing servers. RCON passwords are encrypted with Fernet before storage and decrypted on demand for connections.

## Server Status

The [[backend#Background Worker]] polls all servers every minute. Status is determined by attempting an [[rcon#RCON Protocol]] connection or an A2S query (lightweight UDP probe via python-a2s). The frontend [[frontend/src/pages/DashboardPage.tsx]] shows real-time server status.

## WebSocket Console

[[backend/app/api/console.py]] provides both HTTP POST for one-off commands and a WebSocket endpoint for live RCON console sessions. The frontend [[frontend/src/components/RconConsole.tsx]] connects via WebSocket with reconnection logic, command history (arrow keys), and autocomplete from the [[plugins#GamePlugin]] command schema.

## Server Metrics

[[backend/app/services/metrics_collector.py]] collects player count, status, and performance metrics every 5 minutes, stored as [[backend/app/models/server_metric.py#ServerMetric]] for charting in the frontend analytics views.
