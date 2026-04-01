# RCON Protocol

Garrison communicates with game servers using the Source RCON protocol — a TCP-based binary protocol for remote server administration. The implementation lives in [[backend/app/rcon/manager.py]].

## Packet Format

Each RCON packet is: `[4B size][4B request_id][4B type][body\x00][pad\x00]`. Packet types:
- `SERVERDATA_AUTH` (3) — client sends password
- `SERVERDATA_AUTH_RESPONSE` (2) — server confirms authentication
- `SERVERDATA_EXECCOMMAND` (2) — client sends command
- `SERVERDATA_RESPONSE_VALUE` (0) — server returns command output

## RconManager

[[backend/app/rcon/manager.py#RconManager]] maintains one persistent async TCP connection per server with reference counting.

Features include request ID matching, multi-packet response assembly, auto-reconnect on failure, and Fernet password decryption.

## Non-Conformant Servers

Some servers (notably HumanitZ) don't follow the Source RCON spec. [[backend/app/rcon/manager.py#RconConnection]] detects these via `_nonconformant_ids` and falls back to sequential processing.

These servers may ignore request IDs or return non-standard auth response types (type=0 instead of type=2), which would cause response desync without this detection.

## Plugin RCON Bridge

[[plugins#Plugin System]] plugins don't manage RCON connections directly. [[backend/app/plugins/bridge.py#ConnectedPlugin]] provides a `send_command` callable routing through the RconManager.

Some games (e.g., Hell Let Loose) use entirely custom protocols via `connect_custom`/`send_command_custom` overrides in the plugin.
