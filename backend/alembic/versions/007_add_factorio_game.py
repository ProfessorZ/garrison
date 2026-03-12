"""Add Factorio to games table

Revision ID: 007
Revises: 006
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    games = sa.table(
        "games",
        sa.column("name", sa.String),
        sa.column("plugin_name", sa.String),
        sa.column("default_rcon_port", sa.Integer),
    )
    # Seed both games if the table is empty
    op.execute(
        games.insert().values(name="Project Zomboid", plugin_name="zomboid", default_rcon_port=27015)
    )
    op.execute(
        games.insert().values(name="Factorio", plugin_name="factorio", default_rcon_port=27015)
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM games WHERE plugin_name IN ('zomboid', 'factorio')"))
