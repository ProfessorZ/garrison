"""Add user roles and server_permissions table

Revision ID: 004
Revises: 003
Create Date: 2026-03-11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add role column to users table (default VIEWER; first user will be updated to OWNER)
    op.add_column("users", sa.Column("role", sa.String(20), nullable=False, server_default="VIEWER"))

    # Update existing admin users to ADMIN role, and the first user (id=1) to OWNER
    op.execute("UPDATE users SET role = 'ADMIN' WHERE is_admin = true")
    op.execute("UPDATE users SET role = 'OWNER' WHERE id = (SELECT MIN(id) FROM users WHERE is_admin = true)")

    # Create server_permissions table
    op.create_table(
        "server_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("server_id", sa.Integer(), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "server_id", name="uq_user_server"),
    )
    op.create_index("ix_server_permissions_user_id", "server_permissions", ["user_id"])
    op.create_index("ix_server_permissions_server_id", "server_permissions", ["server_id"])


def downgrade() -> None:
    op.drop_table("server_permissions")
    op.drop_column("users", "role")
