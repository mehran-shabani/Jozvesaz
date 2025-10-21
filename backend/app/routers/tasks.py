"""Task management API routes."""

from __future__ import annotations

import os
import uuid
from contextlib import suppress
from datetime import datetime
from pathlib import Path
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from ..auth.dependencies import get_current_user
from ..celery_app import enqueue_transcription
from ..db import get_session
from ..models import Task, TaskStatus, User

try:  # pragma: no cover - compatibility shim for Pydantic v1/v2
    from pydantic import BaseModel, ConfigDict
except ImportError:  # pragma: no cover
    from pydantic import BaseModel  # type: ignore

    ConfigDict = None  # type: ignore


UPLOAD_SUBDIR = "uploads"
DEFAULT_STORAGE_ROOT = "./storage"
router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


class TaskRead(BaseModel):
    """Representation of a task returned by the API."""

    id: UUID
    title: str
    description: Optional[str] = None
    status: TaskStatus
    owner_id: UUID
    result_path: Optional[str] = None
    completed_at: Optional[datetime] = None

    if "ConfigDict" in globals() and ConfigDict:  # type: ignore[truthy-function]
        model_config = ConfigDict(from_attributes=True)  # type: ignore[call-arg]
    else:
        class Config:  # pragma: no cover - executed on Pydantic v1
            orm_mode = True


def _serialize_task(task: Task) -> TaskRead:
    """Serialize a :class:`Task` ORM instance into ``TaskRead``."""

    if hasattr(TaskRead, "model_validate"):
        return TaskRead.model_validate(task)  # type: ignore[attr-defined]
    return TaskRead.from_orm(task)  # type: ignore[call-arg]


def _ensure_upload_directory() -> Path:
    """Ensure the uploads directory exists and return its path."""

    root = Path(os.getenv("STORAGE_ROOT", DEFAULT_STORAGE_ROOT))
    upload_dir = root / UPLOAD_SUBDIR

    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


async def _persist_upload(upload: UploadFile) -> str:
    """Persist the uploaded file to disk and return the absolute file path."""

    upload_dir = _ensure_upload_directory()
    suffix = Path(upload.filename or "").suffix
    filename = f"{uuid.uuid4()}{suffix}"
    destination = upload_dir / filename

    try:
        with destination.open("wb") as buffer:
            while contents := await upload.read(1024 * 1024):  # Read in 1MB chunks
                buffer.write(contents)
    finally:
        await upload.close()

    return str(destination)


@router.post("", response_model=TaskRead, status_code=status.HTTP_202_ACCEPTED)
async def create_task(
    title: Annotated[str, Form(...)],
    file: Annotated[UploadFile, File(...)],
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    description: Annotated[Optional[str], Form()] = None,
) -> TaskRead:
    """Create a task, persist its payload, and enqueue follow-up processing."""

    file_path = await _persist_upload(file)

    task = Task(title=title, description=description, owner_id=current_user.id)
    session.add(task)

    try:
        session.flush()
        enqueue_transcription(task_id=str(task.id), file_path=file_path)
        session.commit()
        session.refresh(task)
    except Exception:
        session.rollback()
        with suppress(OSError):
            Path(file_path).unlink(missing_ok=True)
        raise

    return _serialize_task(task)


@router.get("", response_model=list[TaskRead])
def list_tasks(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TaskRead]:
    """Return tasks owned by the authenticated user."""

    statement = select(Task).where(Task.owner_id == current_user.id).order_by(Task.created_at.desc())
    tasks = session.exec(statement).all()
    return [_serialize_task(task) for task in tasks]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskRead:
    """Retrieve a single task owned by the authenticated user."""

    task = session.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return _serialize_task(task)


__all__ = ["router"]
