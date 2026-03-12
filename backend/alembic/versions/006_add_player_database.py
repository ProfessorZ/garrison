"""Add player database tables

Revision ID: 006
Revises: 005
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "known_players",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("first_seen", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_seen", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("total_playtime_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("session_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_banned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("ban_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_known_players_id", "known_players", ["id"])
    op.create_index("ix_known_players_name", "known_players", ["name"], unique=True)

    op.create_table(
        "player_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("player_id", sa.Integer(), sa.ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
    )
    op.create_index("ix_player_sessions_id", "player_sessions", ["id"])
    op.create_index("ix_player_sessions_player_id", "player_sessions", ["player_id"])
    op.create_index("ix_player_sessions_server_id", "player_sessions", ["server_id"])

    op.create_table(
        "player_bans",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("player_id", sa.Integer(), sa.ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("banned_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("banned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("unbanned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unbanned_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_player_bans_id", "player_bans", ["id"])
    op.create_index("ix_player_bans_player_id", "player_bans", ["player_id"])

    op.create_table(
        "player_name_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("player_id", sa.Integer(), sa.ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("first_seen_with_name", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_seen_with_name", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_player_name_history_id", "player_name_history", ["id"])
    op.create_index("ix_player_name_history_player_id", "player_name_history", ["player_id"])


def downgrade() -> None:
    op.drop_table("player_name_history")
    op.drop_table("player_bans")
    op.drop_table("player_sessions")
    op.drop_table("known_players")
