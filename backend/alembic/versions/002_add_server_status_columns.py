"""Add server status polling columns

Revision ID: 002
Revises: 001
Create Date: 2026-03-11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("servers", sa.Column("last_status", sa.Boolean(), nullable=True))
    op.add_column("servers", sa.Column("last_checked", sa.DateTime(timezone=True), nullable=True))
    op.add_column("servers", sa.Column("player_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("servers", "player_count")
    op.drop_column("servers", "last_checked")
    op.drop_column("servers", "last_status")
