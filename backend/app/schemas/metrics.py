from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MetricPoint(BaseModel):
    timestamp: datetime
    player_count: int
    is_online: bool
    response_time_ms: Optional[int] = None


class MetricsSummary(BaseModel):
    uptime_24h: float
    uptime_7d: float
    uptime_30d: float
    peak_players_24h: int
    peak_players_7d: int
    peak_players_30d: int
    avg_players_24h: float
    avg_players_7d: float
    avg_players_30d: float
    current_streak_hours: float


class DashboardMetrics(BaseModel):
    total_player_hours_24h: float
    combined_uptime_percent: float


class ServerHeuristicsOut(BaseModel):
    peak_hours: list[int]
    trend: str
    trend_percent: float
    uptime_7d: float
    median_players: float
    is_healthy: bool
