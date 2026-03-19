"""Add ban_templates, player_notes, and Steam fields on known_players

Revision ID: 014
Revises: 013
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ban_templates",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("reason_template", sa.Text, nullable=False),
        sa.Column("duration_hours", sa.Integer, nullable=True),
        sa.Column("created_by_user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "player_notes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("player_id", sa.Integer, sa.ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_player_notes_player_id", "player_notes", ["player_id"])

    # Steam integration columns on known_players
    op.add_column("known_players", sa.Column("steam_id", sa.String(20), nullable=True))
    op.add_column("known_players", sa.Column("vac_banned", sa.Boolean, nullable=False, server_default="false"))
    op.add_column("known_players", sa.Column("vac_ban_count", sa.Integer, nullable=False, server_default="0"))
    op.add_column("known_players", sa.Column("days_since_last_ban", sa.Integer, nullable=False, server_default="0"))
    op.add_column("known_players", sa.Column("game_banned", sa.Boolean, nullable=False, server_default="false"))
    op.add_column("known_players", sa.Column("steam_profile_visibility", sa.Integer, nullable=False, server_default="3"))
    op.add_column("known_players", sa.Column("steam_avatar_url", sa.String(500), nullable=True))
    op.add_column("known_players", sa.Column("steam_persona_name", sa.String(200), nullable=True))
    op.add_column("known_players", sa.Column("alt_account_ids", sa.JSON, nullable=False, server_default="[]"))
    op.add_column("known_players", sa.Column("steam_checked_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_known_players_steam_id", "known_players", ["steam_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_known_players_steam_id")
    op.drop_column("known_players", "steam_checked_at")
    op.drop_column("known_players", "alt_account_ids")
    op.drop_column("known_players", "steam_persona_name")
    op.drop_column("known_players", "steam_avatar_url")
    op.drop_column("known_players", "steam_profile_visibility")
    op.drop_column("known_players", "game_banned")
    op.drop_column("known_players", "days_since_last_ban")
    op.drop_column("known_players", "vac_ban_count")
    op.drop_column("known_players", "vac_banned")
    op.drop_column("known_players", "steam_id")
    op.drop_index("ix_player_notes_player_id")
    op.drop_table("player_notes")
    op.drop_table("ban_templates")
