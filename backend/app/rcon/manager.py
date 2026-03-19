"""
Async RCON Connection Manager using raw sockets (Source RCON protocol).

Maintains persistent connections per server with auto-reconnect.
"""

import asyncio
import logging
import struct
from enum import IntEnum

logger = logging.getLogger(__name__)

# --- Source RCON Protocol Constants ---

class PacketType(IntEnum):
    SERVERDATA_RESPONSE_VALUE = 0
    SERVERDATA_EXECCOMMAND = 2
    SERVERDATA_AUTH_RESPONSE = 2
    SERVERDATA_AUTH = 3


# Packet layout: [4-byte size][4-byte id][4-byte type][body + \x00][pad \x00]
# size = len(id + type + body + 2 null bytes) = 4 + 4 + len(body) + 2
HEADER_SIZE = 12  # size(4) + id(4) + type(4)
MIN_PACKET_SIZE = 10  # id(4) + type(4) + body_null(1) + pad_null(1)


def _encode_packet(request_id: int, packet_type: int, body: str) -> bytes:
    """Encode a Source RCON packet."""
    body_bytes = body.encode("utf-8") + b"\x00\x00"
    size = 4 + 4 + len(body_bytes)  # id + type + body+nulls
    return struct.pack("<iii", size, request_id, packet_type) + body_bytes


async def _read_packet(reader: asyncio.StreamReader) -> tuple[int, int, str]:
    """Read and decode a single Source RCON packet. Returns (id, type, body)."""
    size_data = await asyncio.wait_for(reader.readexactly(4), timeout=10.0)
    (size,) = struct.unpack("<i", size_data)
    if size < MIN_PACKET_SIZE or size > 65536:
        raise ValueError(f"Invalid RCON packet size: {size}")
    payload = await asyncio.wait_for(reader.readexactly(size), timeout=10.0)
    request_id, packet_type = struct.unpack("<ii", payload[:8])
    # Body is everything after id+type, minus the two null terminators
    body = payload[8:-2].decode("utf-8", errors="replace")
    return request_id, packet_type, body


class RconConnection:
    """A single persistent RCON connection to a game server."""

    def __init__(self, host: str, port: int, password: str):
        self.host = host
        self.port = port
        self._password = password
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._lock = asyncio.Lock()
        self._request_id = 0
        self._authenticated = False

    @property
    def connected(self) -> bool:
        return self._writer is not None and not self._writer.is_closing()

    def _next_id(self) -> int:
        self._request_id += 1
        if self._request_id > 0x7FFFFFFF:
            self._request_id = 1
        return self._request_id

    async def connect(self) -> None:
        """Open TCP connection and authenticate."""
        if self.connected:
            return
        try:
            self._reader, self._writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                timeout=10.0,
            )
            await self._authenticate()
        except Exception:
            await self.close()
            raise

    async def _authenticate(self) -> None:
        """Send auth packet and verify response."""
        auth_id = self._next_id()
        packet = _encode_packet(auth_id, PacketType.SERVERDATA_AUTH, self._password)
        self._writer.write(packet)
        await self._writer.drain()

        # Server sends an empty RESPONSE_VALUE first, then AUTH_RESPONSE
        resp_id, resp_type, _ = await _read_packet(self._reader)
        # Some servers skip the empty response, check if this is already the auth response
        if resp_type == PacketType.SERVERDATA_AUTH_RESPONSE and resp_id == -1:
            raise ConnectionRefusedError("RCON authentication failed (bad password)")
        if resp_type == PacketType.SERVERDATA_AUTH_RESPONSE and resp_id == auth_id:
            self._authenticated = True
            return
        # Otherwise read the actual auth response
        resp_id, resp_type, _ = await _read_packet(self._reader)
        if resp_id == -1:
            raise ConnectionRefusedError("RCON authentication failed (bad password)")
        self._authenticated = True

    async def send_command(self, command: str) -> str:
        """Send a command and return the response string."""
        if not self.connected or not self._authenticated:
            raise ConnectionError("Not connected or not authenticated")
        async with self._lock:
            cmd_id = self._next_id()
            # Send command packet
            self._writer.write(
                _encode_packet(cmd_id, PacketType.SERVERDATA_EXECCOMMAND, command)
            )
            # Send a follow-up empty packet to detect end of multi-packet responses
            end_id = self._next_id()
            self._writer.write(
                _encode_packet(end_id, PacketType.SERVERDATA_RESPONSE_VALUE, "")
            )
            await self._writer.drain()

            # Read response packets until we see end_id
            body_parts: list[str] = []
            while True:
                resp_id, resp_type, body = await _read_packet(self._reader)
                if resp_id == end_id:
                    break
                if resp_id == cmd_id:
                    body_parts.append(body)
            return "".join(body_parts)

    async def close(self) -> None:
        """Close the connection."""
        self._authenticated = False
        if self._writer and not self._writer.is_closing():
            try:
                self._writer.close()
                await self._writer.wait_closed()
            except Exception:
                pass
        self._writer = None
        self._reader = None


class RconManager:
    """
    Connection pool that maintains one persistent RCON connection per server_id.
    Thread-safe via asyncio locks.
    """

    def __init__(self):
        self._connections: dict[int, RconConnection] = {}
        self._refcounts: dict[int, int] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self, server_id: int, host: str, port: int, password: str
    ) -> None:
        """Create or reconnect RCON for a server. Reference-counted so multiple
        callers can share a connection without tearing it down prematurely."""
        async with self._lock:
            existing = self._connections.get(server_id)
            if existing and existing.connected:
                if existing.host == host and existing.port == port:
                    self._refcounts[server_id] = self._refcounts.get(server_id, 0) + 1
                    return
                # Different target — close old connection
                await existing.close()

            conn = RconConnection(host, port, password)
            await conn.connect()
            self._connections[server_id] = conn
            self._refcounts[server_id] = 1

    async def disconnect(self, server_id: int) -> None:
        """Decrement ref count; only close when count reaches zero."""
        async with self._lock:
            count = self._refcounts.get(server_id, 1) - 1
            if count > 0:
                self._refcounts[server_id] = count
                return
            self._refcounts.pop(server_id, None)
            conn = self._connections.pop(server_id, None)
        if conn:
            await conn.close()

    async def send_command(self, server_id: int, command: str) -> str:
        """Send a command to a connected server. Auto-reconnects once on failure."""
        conn = self._connections.get(server_id)
        if not conn:
            raise ConnectionError(f"No RCON connection for server {server_id}")
        try:
            return await conn.send_command(command)
        except Exception as e:
            logger.warning("RCON command failed for server %s, reconnecting: %s", server_id, e)
            # Try reconnecting once
            try:
                await conn.close()
                await conn.connect()
                return await conn.send_command(command)
            except Exception as e2:
                logger.error("RCON reconnect failed for server %s: %s", server_id, e2)
                async with self._lock:
                    self._connections.pop(server_id, None)
                raise ConnectionError(f"RCON connection lost: {e2}") from e2

    def is_connected(self, server_id: int) -> bool:
        """Check if a server has an active RCON connection."""
        conn = self._connections.get(server_id)
        return conn is not None and conn.connected

    async def close_all(self) -> None:
        """Shut down all connections."""
        async with self._lock:
            conns = list(self._connections.values())
            self._connections.clear()
            self._refcounts.clear()
        for conn in conns:
            await conn.close()


# Singleton manager instance
rcon_manager = RconManager()
