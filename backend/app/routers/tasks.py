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
from fastapi.responses import PlainTextResponse
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
RESULTS_SUBDIR = "results"
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


def _storage_root(*, ensure_exists: bool = False) -> Path:
    """Return the configured storage root path."""

    root = Path(os.getenv("STORAGE_ROOT", DEFAULT_STORAGE_ROOT)).resolve()
    if ensure_exists:
        root.mkdir(parents=True, exist_ok=True)
    return root


def _ensure_upload_directory() -> Path:
    """Ensure the uploads directory exists and return its path."""

    root = _storage_root(ensure_exists=True)
    upload_dir = root / UPLOAD_SUBDIR

    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _ensure_results_directory() -> Path:
    """Ensure the results directory exists and return its path."""

    root = _storage_root(ensure_exists=True)
    results_dir = root / RESULTS_SUBDIR

    results_dir.mkdir(parents=True, exist_ok=True)
    return results_dir


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


def _resolve_local_result_path(task: Task, *, storage_root: Path | None = None) -> Path | None:
    """Return the filesystem path for an existing local result, if any."""

    root = storage_root or _storage_root()
    if not task.result_path or task.result_path.startswith(("http://", "https://")):
        return None

    candidate = Path(task.result_path)
    if not candidate.is_absolute():
        candidate = root / candidate

    try:
        candidate.resolve().relative_to(root)
    except ValueError:
        return None

    return candidate


def _default_result_path(task_id: UUID, *, storage_root: Path | None = None) -> Path:
    """Return the default path for storing task results."""

    root = storage_root or _storage_root()
    return root / RESULTS_SUBDIR / f"{task_id}.txt"


def _result_candidates(task: Task) -> list[Path]:
    """Return candidate filesystem paths where a task result may be stored."""

    storage_root = _storage_root()
    candidates: list[Path] = []

    existing = _resolve_local_result_path(task, storage_root=storage_root)
    if existing is not None:
        candidates.append(existing)

    default_path = _default_result_path(task.id, storage_root=storage_root)
    if not any(path == default_path for path in candidates):
        candidates.append(default_path)

    return candidates


class TaskResultUpdate(BaseModel):
    """Payload for updating a task's result content."""

    content: str


class TaskResultResponse(BaseModel):
    """Response returned after persisting a task's result content."""

    result_path: str


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


@router.get("/{task_id}/result", response_class=PlainTextResponse)
def get_task_result(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> str:
    """Return the stored textual result for a task owned by the user."""

    task = session.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    for candidate in _result_candidates(task):
        if not candidate.exists():
            continue
        try:
            return candidate.read_text(encoding="utf-8")
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to read task result",
            ) from exc

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task result not found")


@router.put("/{task_id}/result", response_model=TaskResultResponse)
def update_task_result(
    task_id: UUID,
    payload: TaskResultUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskResultResponse:
    """Persist edits to a task's textual result content."""

    task = session.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    storage_root = _storage_root(ensure_exists=True)
    destination = _resolve_local_result_path(task, storage_root=storage_root)
    if destination is None:
        destination = _ensure_results_directory() / f"{task.id}.txt"
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)

    try:
        destination.write_text(payload.content, encoding="utf-8")
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to persist task result",
        ) from exc

    task.result_path = str(destination)
    session.add(task)
    session.commit()
    session.refresh(task)

    return TaskResultResponse(result_path=task.result_path)


__all__ = ["router"]
