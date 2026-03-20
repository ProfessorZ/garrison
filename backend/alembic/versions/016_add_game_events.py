"""Add game_events table

Revision ID: 016
Revises: 015
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "game_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("player_name", sa.String(200), nullable=True),
        sa.Column("player_id", sa.String(100), nullable=True),
        sa.Column("target_name", sa.String(200), nullable=True),
        sa.Column("target_id", sa.String(100), nullable=True),
        sa.Column("message", sa.String(), nullable=True),
        sa.Column("weapon", sa.String(200), nullable=True),
        sa.Column("raw", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_game_events_server_type", "game_events", ["server_id", "event_type"])
    op.create_index("ix_game_events_server_ts", "game_events", ["server_id", "timestamp"])
    op.create_index("ix_game_events_player", "game_events", ["player_id"])


def downgrade() -> None:
    op.drop_index("ix_game_events_player")
    op.drop_index("ix_game_events_server_ts")
    op.drop_index("ix_game_events_server_type")
    op.drop_table("game_events")
