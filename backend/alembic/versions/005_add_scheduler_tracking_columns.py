"""Add tracking columns to scheduled_commands

Revision ID: 005
Revises: 004
Create Date: 2026-03-11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("scheduled_commands", sa.Column("last_run", sa.DateTime(timezone=True), nullable=True))
    op.add_column("scheduled_commands", sa.Column("next_run", sa.DateTime(timezone=True), nullable=True))
    op.add_column("scheduled_commands", sa.Column("run_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("scheduled_commands", sa.Column("last_result", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("scheduled_commands", "last_result")
    op.drop_column("scheduled_commands", "run_count")
    op.drop_column("scheduled_commands", "next_run")
    op.drop_column("scheduled_commands", "last_run")
