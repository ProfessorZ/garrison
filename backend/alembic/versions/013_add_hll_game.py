"""Add Hell Let Loose to games table

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
    op.execute(sa.text("""
        INSERT INTO games (name, plugin_name, default_rcon_port)
        SELECT 'Hell Let Loose', 'hll', 7787
        WHERE NOT EXISTS (
            SELECT 1 FROM games WHERE plugin_name = 'hll'
        )
    """))


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM games WHERE plugin_name = 'hll'"))
