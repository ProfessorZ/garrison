"""Add discord_username and discord_avatar columns to users table

Revision ID: 010
Revises: 009
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("discord_username", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("discord_avatar", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "discord_avatar")
    op.drop_column("users", "discord_username")
