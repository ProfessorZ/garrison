import logging
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

STEAM_API_BASE = "https://api.steampowered.com"


@dataclass
class SteamPlayerInfo:
    steam_id: str
    persona_name: str
    avatar_url: str
    profile_url: str
    profile_visibility: int  # 1=private, 3=public
    vac_banned: bool
    number_of_vac_bans: int
    days_since_last_ban: int
    game_banned: bool
    community_banned: bool
    created_at: Optional[int]  # unix timestamp, None if private


async def get_player_summary(steam_id: str, api_key: str) -> Optional[SteamPlayerInfo]:
    """Fetch a single player's full info (summary + bans) from Steam API."""
    results = await batch_get_players([steam_id], api_key)
    return results[0] if results else None


async def get_vac_status(steam_id: str, api_key: str) -> Optional[dict]:
    """Fetch VAC/game ban status for a single Steam ID."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{STEAM_API_BASE}/ISteamUser/GetPlayerBans/v1/",
                params={"key": api_key, "steamids": steam_id},
            )
            resp.raise_for_status()
            data = resp.json()
            players = data.get("players", [])
            if not players:
                return None
            p = players[0]
            return {
                "vac_banned": p.get("VACBanned", False),
                "number_of_vac_bans": p.get("NumberOfVACBans", 0),
                "days_since_last_ban": p.get("DaysSinceLastBan", 0),
                "game_banned": p.get("NumberOfGameBans", 0) > 0,
                "community_banned": p.get("CommunityBanned", False),
            }
    except Exception as e:
        logger.warning("Failed to fetch VAC status for %s: %s", steam_id, e)
        return None


async def batch_get_players(steam_ids: list[str], api_key: str) -> list[SteamPlayerInfo]:
    """Fetch summary + ban info for up to 100 Steam IDs in one batch."""
    if not steam_ids or not api_key:
        return []

    ids_str = ",".join(steam_ids)
    summaries: dict[str, dict] = {}
    bans: dict[str, dict] = {}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Fetch summaries and bans in parallel
            summary_resp, bans_resp = await _fetch_batch(client, api_key, ids_str)

            for p in summary_resp:
                summaries[str(p["steamid"])] = p
            for p in bans_resp:
                bans[str(p["SteamId"])] = p
    except Exception as e:
        logger.warning("Steam batch fetch failed: %s", e)
        return []

    results = []
    for sid in steam_ids:
        s = summaries.get(sid)
        b = bans.get(sid)
        if not s:
            continue
        results.append(SteamPlayerInfo(
            steam_id=sid,
            persona_name=s.get("personaname", ""),
            avatar_url=s.get("avatarfull", s.get("avatar", "")),
            profile_url=s.get("profileurl", ""),
            profile_visibility=s.get("communityvisibilitystate", 1),
            vac_banned=b.get("VACBanned", False) if b else False,
            number_of_vac_bans=b.get("NumberOfVACBans", 0) if b else 0,
            days_since_last_ban=b.get("DaysSinceLastBan", 0) if b else 0,
            game_banned=(b.get("NumberOfGameBans", 0) > 0) if b else False,
            community_banned=b.get("CommunityBanned", False) if b else False,
            created_at=s.get("timecreated"),
        ))
    return results


async def _fetch_batch(
    client: httpx.AsyncClient, api_key: str, ids_str: str
) -> tuple[list[dict], list[dict]]:
    """Fetch player summaries and bans concurrently."""
    import asyncio

    async def _summaries():
        resp = await client.get(
            f"{STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/",
            params={"key": api_key, "steamids": ids_str},
        )
        resp.raise_for_status()
        return resp.json().get("response", {}).get("players", [])

    async def _bans():
        resp = await client.get(
            f"{STEAM_API_BASE}/ISteamUser/GetPlayerBans/v1/",
            params={"key": api_key, "steamids": ids_str},
        )
        resp.raise_for_status()
        return resp.json().get("players", [])

    return await asyncio.gather(_summaries(), _bans())
