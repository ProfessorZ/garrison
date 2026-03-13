"""Add triggers table

Revision ID: 012
Revises: 011
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "triggers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("server_id", sa.Integer, sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("event_config", sa.JSON, default={}),
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("action_config", sa.JSON, default={}),
        sa.Column("condition", sa.JSON, nullable=True),
        sa.Column("cooldown_seconds", sa.Integer, default=0, nullable=False),
        sa.Column("last_fired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fire_count", sa.Integer, default=0, nullable=False),
        sa.Column("created_by_user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_triggers_server_id", "triggers", ["server_id"])
    op.create_index("ix_triggers_event_type", "triggers", ["event_type"])
    op.create_index("ix_triggers_is_active", "triggers", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_triggers_is_active")
    op.drop_index("ix_triggers_event_type")
    op.drop_index("ix_triggers_server_id")
    op.drop_table("triggers")
