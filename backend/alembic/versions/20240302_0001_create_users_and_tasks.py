"""Initial schema for user and task tables."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy import func
from sqlmodel.sql.sqltypes import GUID

# revision identifiers, used by Alembic.
revision = "20240302_0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default=sa.text("'active'")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=func.now(),
            server_onupdate=func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "tasks",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default=sa.text("'pending'")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=func.now(),
            server_onupdate=func.now(),
            nullable=False,
        ),
        sa.Column("owner_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_index("ix_tasks_owner_id", "tasks", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tasks_owner_id", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
