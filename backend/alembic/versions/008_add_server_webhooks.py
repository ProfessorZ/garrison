"""Add server_webhooks table for Discord webhook integration

Revision ID: 008
Revises: 007
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "server_webhooks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("webhook_url_encrypted", sa.String(1024), nullable=False),
        sa.Column(
            "events",
            sa.Text(),
            nullable=False,
            server_default='["server_online","server_offline","player_join","player_leave","player_kick","player_ban","scheduled_command","server_error"]',
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_server_webhooks_server_id", "server_webhooks", ["server_id"])


def downgrade() -> None:
    op.drop_index("ix_server_webhooks_server_id", table_name="server_webhooks")
    op.drop_table("server_webhooks")
