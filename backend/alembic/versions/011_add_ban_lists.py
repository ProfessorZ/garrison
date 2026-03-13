"""Add ban list tables

Revision ID: 011
Revises: 010
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ban_lists",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_global", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ban_lists_id", "ban_lists", ["id"])

    op.create_table(
        "ban_list_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ban_list_id", sa.Integer(), sa.ForeignKey("ban_lists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("player_id", sa.Integer(), sa.ForeignKey("known_players.id", ondelete="SET NULL"), nullable=True),
        sa.Column("player_name", sa.String(100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("added_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ban_list_entries_id", "ban_list_entries", ["id"])
    op.create_index("ix_ban_list_entries_ban_list_id", "ban_list_entries", ["ban_list_id"])
    op.create_index("ix_ban_list_entries_player_id", "ban_list_entries", ["player_id"])

    op.create_table(
        "server_ban_lists",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ban_list_id", sa.Integer(), sa.ForeignKey("ban_lists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("auto_enforce", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_server_ban_lists_id", "server_ban_lists", ["id"])
    op.create_index("ix_server_ban_lists_server_id", "server_ban_lists", ["server_id"])
    op.create_index("ix_server_ban_lists_ban_list_id", "server_ban_lists", ["ban_list_id"])


def downgrade() -> None:
    op.drop_table("server_ban_lists")
    op.drop_table("ban_list_entries")
    op.drop_table("ban_lists")
