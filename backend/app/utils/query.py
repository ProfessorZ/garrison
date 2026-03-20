import asyncio

import a2s


async def query_server(host: str, port: int, timeout: float = 3.0) -> dict | None:
    """Query server via Steam A2S. Returns None on failure."""
    try:
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(
            None, lambda: a2s.info((host, port), timeout=timeout)
        )
        return {
            "name": info.server_name,
            "map": info.map_name,
            "players": info.player_count,
            "max_players": info.max_players,
            "game": info.game,
            "online": True,
        }
    except Exception:
        return None
