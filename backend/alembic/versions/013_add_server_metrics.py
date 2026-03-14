"""Add server_metrics table

Revision ID: 013
Revises: 012
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "server_metrics",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("server_id", sa.Integer, sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("player_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_online", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("response_time_ms", sa.Integer, nullable=True),
    )
    op.create_index("ix_server_metrics_server_id", "server_metrics", ["server_id"])
    op.create_index("ix_server_metrics_recorded_at", "server_metrics", ["recorded_at"])
    op.create_index("ix_server_metrics_server_recorded", "server_metrics", ["server_id", "recorded_at"])


def downgrade() -> None:
    op.drop_index("ix_server_metrics_server_recorded")
    op.drop_index("ix_server_metrics_recorded_at")
    op.drop_index("ix_server_metrics_server_id")
    op.drop_table("server_metrics")
