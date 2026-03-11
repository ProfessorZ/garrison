"""Add activity_logs and chat_messages tables

Revision ID: 003
Revises: 002
Create Date: 2026-03-11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum values matching ActionType
ACTION_TYPE_VALUES = (
    "COMMAND", "KICK", "BAN", "UNBAN",
    "SERVER_CREATE", "SERVER_UPDATE", "SERVER_DELETE", "LOGIN",
)

action_type_enum = sa.Enum(*ACTION_TYPE_VALUES, name="action_type", create_constraint=True)


def upgrade() -> None:
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("detail", sa.Text(), server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_activity_logs_server_id", "activity_logs", ["server_id"])
    op.create_index("ix_activity_logs_user_id", "activity_logs", ["user_id"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("player_name", sa.String(100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_chat_messages_server_id", "chat_messages", ["server_id"])
    op.create_index("ix_chat_messages_timestamp", "chat_messages", ["timestamp"])


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("activity_logs")
