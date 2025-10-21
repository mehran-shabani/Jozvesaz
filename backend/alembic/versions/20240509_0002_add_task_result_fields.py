"""Add result tracking fields to tasks."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20240509_0002"
down_revision = "20240302_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("result_path", sa.String(length=1024), nullable=True))
    op.add_column("tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column(
        "tasks",
        "status",
        existing_type=sa.String(length=50),
        server_default=sa.text("'PENDING'"),
        existing_nullable=False,
    )
    op.execute("UPDATE tasks SET status = 'PENDING' WHERE status = 'pending'")
    op.execute("UPDATE tasks SET status = 'PROCESSING' WHERE status = 'in_progress'")
    op.execute("UPDATE tasks SET status = 'COMPLETED' WHERE status = 'completed'")
    op.execute("UPDATE tasks SET status = 'CANCELLED' WHERE status = 'cancelled'")


def downgrade() -> None:
    op.execute("UPDATE tasks SET status = 'cancelled' WHERE status = 'CANCELLED'")
    op.execute("UPDATE tasks SET status = 'completed' WHERE status = 'COMPLETED'")
    op.execute("UPDATE tasks SET status = 'in_progress' WHERE status = 'PROCESSING'")
    op.execute("UPDATE tasks SET status = 'pending' WHERE status = 'PENDING'")
    op.alter_column(
        "tasks",
        "status",
        existing_type=sa.String(length=50),
        server_default=sa.text("'pending'"),
        existing_nullable=False,
    )
    op.drop_column("tasks", "completed_at")
    op.drop_column("tasks", "result_path")
