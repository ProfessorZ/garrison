"""Add query_port to servers

Revision ID: 015
Revises: 014
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("servers", sa.Column("query_port", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("servers", "query_port")
