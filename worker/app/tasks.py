"""Celery tasks executed by the worker service."""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import contextmanager, suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from celery.app.task import Task

from backend.app.celery_app import TRANSCRIBE_AUDIO_TASK_NAME, celery_app
from backend.app.models import Task as DbTask
from backend.app.models import TaskStatus
from worker.app import monitoring as _monitoring  # ensure signal handlers are registered
from worker.app.transcription import get_transcription_model

_ = _monitoring  # Explicitly reference to avoid lint complaints about unused import


@contextmanager
def _session_scope():
    """Delegate to the backend session factory at call time.

    Importing the backend database module lazily avoids holding on to stale
    engines during test runs that repeatedly reload modules.
    """

    from backend.app import db as backend_db

    with backend_db.session_scope() as session:
        yield session

logger = logging.getLogger(__name__)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STORAGE_ROOT = REPOSITORY_ROOT / "storage"
UPLOAD_SUBDIR = "uploads"
RESULTS_SUBDIR = "results"


class TaskNotFoundError(RuntimeError):
    """Raised when the referenced task record cannot be located."""


def _storage_root() -> Path:
    """Return the root directory used for storage operations."""

    override = os.getenv("STORAGE_ROOT")
    if override:
        return Path(override)
    return DEFAULT_STORAGE_ROOT


def _resolve_upload_path(file_path: str) -> Path:
    """Resolve the absolute path to the uploaded file."""

    candidate = Path(file_path)
    if candidate.is_absolute():
        return candidate

    storage_root = _storage_root()
    storage_parts = storage_root.parts
    candidate_parts = candidate.parts

    if storage_parts and candidate_parts[: len(storage_parts)] == storage_parts:
        remainder = candidate_parts[len(storage_parts) :]
        return storage_root.joinpath(*remainder)

    if candidate_parts and candidate_parts[0] == storage_root.name:
        remainder = candidate_parts[1:]
        return storage_root.joinpath(*remainder)

    if candidate_parts and candidate_parts[0] == UPLOAD_SUBDIR:
        return storage_root.joinpath(*candidate_parts)

    return storage_root / UPLOAD_SUBDIR / candidate


def _result_path(task_id: uuid.UUID) -> Path:
    """Return the output path for storing a transcription result."""

    destination_dir = _storage_root() / RESULTS_SUBDIR
    destination_dir.mkdir(parents=True, exist_ok=True)
    return destination_dir / f"{task_id}.txt"


def _fetch_task(session, task_id: uuid.UUID) -> DbTask:
    """Retrieve the :class:`backend.app.models.Task` instance for ``task_id``."""

    task = session.get(DbTask, task_id)
    if task is None:
        raise TaskNotFoundError(f"Task {task_id} was not found")
    return task


def _update_task(
    task_id: uuid.UUID,
    *,
    status: TaskStatus,
    result_path: str | None,
    completed_at: datetime | None,
) -> None:
    """Persist task state transitions in the database."""

    with _session_scope() as session:
        task = _fetch_task(session, task_id)
        task.status = status
        task.result_path = result_path
        task.completed_at = completed_at
        session.add(task)


@celery_app.task(name=TRANSCRIBE_AUDIO_TASK_NAME, bind=True)
def transcribe_audio(self: Task, task_id: str, file_path: str) -> dict[str, Any]:
    """Process an uploaded audio file and persist the transcription result."""

    try:
        task_uuid = uuid.UUID(task_id)
    except ValueError as exc:  # pragma: no cover - defensive guard
        logger.exception("Received invalid task identifier: %s", task_id)
        raise ValueError(f"Invalid task identifier: {task_id}") from exc

    logger.info("Starting transcription for task %s", task_uuid)
    _update_task(task_uuid, status=TaskStatus.PROCESSING, result_path=None, completed_at=None)

    source_path = _resolve_upload_path(file_path)
    destination_path = _result_path(task_uuid)

    try:
        if not source_path.exists():
            raise FileNotFoundError(f"Input file {source_path} does not exist")

        model = get_transcription_model()
        transcription = model.transcribe(source_path)
        destination_path.write_text(transcription, encoding="utf-8")
    except Exception:
        with suppress(OSError):
            destination_path.unlink()
        try:
            _update_task(task_uuid, status=TaskStatus.FAILED, result_path=None, completed_at=None)
        except TaskNotFoundError:  # pragma: no cover - the task could have been removed
            logger.error("Unable to mark task %s as FAILED because it no longer exists", task_uuid)
        logger.exception("Transcription failed for task %s", task_uuid)
        raise

    completed_at = datetime.now(timezone.utc)
    _update_task(
        task_uuid,
        status=TaskStatus.COMPLETED,
        result_path=str(destination_path),
        completed_at=completed_at,
    )
    logger.info("Completed transcription for task %s", task_uuid)

    return {"task_id": task_id, "result_path": str(destination_path)}


__all__ = ["transcribe_audio"]
