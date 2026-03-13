"""Add discord_id column to users table for Discord account linking

Revision ID: 009
Revises: 008
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("discord_id", sa.String(30), nullable=True))
    op.create_index("ix_users_discord_id", "users", ["discord_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_discord_id", table_name="users")
    op.drop_column("users", "discord_id")
