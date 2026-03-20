"""HLL RCON protocol: XOR-encrypted plaintext over TCP."""

import asyncio
import logging

logger = logging.getLogger(__name__)

# How long to wait for additional data before considering a response complete.
_READ_TIMEOUT = 2.0
_CHUNK_SIZE = 4096


def _xor_encrypt(data: bytes, key: bytes) -> bytes:
    """XOR each byte of *data* with the 4-byte *key* (cycling)."""
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


# Decrypt is the same operation — XOR is its own inverse.
_xor_decrypt = _xor_encrypt


class HLLConnection:
    """Manages a TCP connection to a Hell Let Loose RCON server."""

    def __init__(self, host: str, port: int, password: str):
        self.host = host
        self.port = port
        self.password = password
        self._xor_key: bytes = b""
        self.reader: asyncio.StreamReader | None = None
        self.writer: asyncio.StreamWriter | None = None
        self._lock = asyncio.Lock()

    # ── public API ────────────────────────────────────────────────

    async def connect(self) -> None:
        """Connect to the server, receive the XOR key, and authenticate."""
        self.reader, self.writer = await asyncio.wait_for(
            asyncio.open_connection(self.host, self.port),
            timeout=10,
        )

        # Step 1: server sends 4-byte XOR key immediately on connect.
        self._xor_key = await asyncio.wait_for(
            self.reader.readexactly(4),
            timeout=10,
        )
        logger.debug("Received XOR key: %s", self._xor_key.hex())

        # Step 2: send XOR-encrypted password (null-terminated).
        password_bytes = (self.password + "\0").encode("utf-8")
        self.writer.write(_xor_encrypt(password_bytes, self._xor_key))
        await self.writer.drain()

        # Step 3: read auth response — should decrypt to "PASS" or "FAIL".
        raw_resp = await self._read_response()
        if raw_resp != "PASS":
            await self.close()
            raise ConnectionError(
                f"HLL authentication failed (server responded: {raw_resp!r})"
            )

        logger.info("HLL RCON authenticated to %s:%d", self.host, self.port)

    async def send(self, command: str) -> str:
        """Send an RCON command and return the plaintext response."""
        async with self._lock:
            cmd_bytes = command.encode("utf-8")
            self.writer.write(_xor_encrypt(cmd_bytes, self._xor_key))
            await self.writer.drain()
            return await self._read_response()

    async def close(self) -> None:
        """Close the TCP connection."""
        if self.writer:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass
            self.writer = None
            self.reader = None

    @property
    def connected(self) -> bool:
        return self.writer is not None and not self.writer.is_closing()

    # ── internals ─────────────────────────────────────────────────

    async def _read_response(self) -> str:
        """Read and decrypt a full response from the server.

        HLL RCON has no explicit length framing — we keep reading until
        the server stops sending data (detected via a short timeout).
        """
        buf = bytearray()
        while True:
            try:
                chunk = await asyncio.wait_for(
                    self.reader.read(_CHUNK_SIZE),
                    timeout=_READ_TIMEOUT,
                )
                if not chunk:
                    # Connection closed by server.
                    break
                buf.extend(chunk)
            except asyncio.TimeoutError:
                # No more data — response is complete.
                break

        decrypted = _xor_decrypt(bytes(buf), self._xor_key)
        # Strip any trailing null bytes or whitespace.
        return decrypted.decode("utf-8", errors="replace").strip("\x00").strip()
