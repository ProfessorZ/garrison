"""Add discord_channel_id to servers and discord_user_id to activity_logs

Revision ID: 017
Revises: 016
Create Date: 2026-04-01
"""

from alembic import op
import sqlalchemy as sa

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add discord_channel_id to servers table
    op.add_column(
        "servers",
        sa.Column("discord_channel_id", sa.BigInteger(), nullable=True),
    )

    # Add discord_user_id to activity_logs table
    op.add_column(
        "activity_logs",
        sa.Column("discord_user_id", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("activity_logs", "discord_user_id")
    op.drop_column("servers", "discord_channel_id")
