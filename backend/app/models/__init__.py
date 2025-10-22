"""Database models for the backend application."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from sqlalchemy import Column, DateTime, event, func
from sqlmodel import Field, SQLModel


class TimestampMixin(SQLModel):
    """Mixin that adds timestamp columns to inheriting models."""

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": func.now()},
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": func.now(), "onupdate": func.now()},
    )


class UserStatus(str, Enum):
    """Lifecycle status for application users."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class TaskStatus(str, Enum):
    """Workflow status for tasks."""

    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class User(TimestampMixin, table=True):
    """Represents an authenticated user of the platform."""

    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
        index=True,
    )
    email: str = Field(
        index=True,
        nullable=False,
        max_length=255,
        sa_column_kwargs={"unique": True},
    )
    full_name: Optional[str] = Field(default=None, max_length=255)
    hashed_password: str = Field(nullable=False, max_length=255)
    status: UserStatus = Field(default=UserStatus.ACTIVE, nullable=False)

class Task(TimestampMixin, table=True):
    """Represents a unit of work owned by a user."""

    __tablename__ = "tasks"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
        index=True,
    )
    title: str = Field(nullable=False, max_length=255)
    description: Optional[str] = Field(default=None)
    status: TaskStatus = Field(
        default=TaskStatus.PENDING,
        nullable=False,
        max_length=50,
        sa_column_kwargs={"server_default": "PENDING"},
    )

    result_path: Optional[str] = Field(default=None, max_length=1024)
    completed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    owner_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)


__all__ = [
    "Task",
    "TaskStatus",
    "TimestampMixin",
    "User",
    "UserStatus",
]


@event.listens_for(Task, "load")
def _apply_utc_timezone(task: Task, _context: Any) -> None:
    """Ensure ``Task.completed_at`` retains UTC tzinfo when loaded."""

    if task.completed_at is not None and task.completed_at.tzinfo is None:
        task.completed_at = task.completed_at.replace(tzinfo=timezone.utc)
