"""Celery application configuration and task wrappers."""

from __future__ import annotations

import os
from typing import Any

from celery import Celery
from celery.result import AsyncResult

DEFAULT_REDIS_URL = "redis://localhost:6379/0"
DEFAULT_QUEUE_NAME = "celery"
DEFAULT_TIMEZONE = "UTC"


def _determine_redis_url() -> str:
    """Determine the Redis URL used for the Celery broker and backend."""

    return (
        os.getenv("CELERY_BROKER_URL")
        or os.getenv("CELERY_URL")
        or os.getenv("REDIS_URL")
        or os.getenv("REDIS_CACHE_URL")
        or DEFAULT_REDIS_URL
    )


def _determine_result_backend(default: str) -> str:
    """Determine the Celery result backend, defaulting to the broker URL."""

    return (
        os.getenv("CELERY_RESULT_BACKEND")
        or os.getenv("CELERY_BACKEND_URL")
        or os.getenv("RESULT_BACKEND")
        or default
    )


_broker_url = _determine_redis_url()
_backend_url = _determine_result_backend(_broker_url)
_default_queue = os.getenv("CELERY_TASK_QUEUE") or os.getenv("CELERY_QUEUE_NAME") or DEFAULT_QUEUE_NAME
_timezone = os.getenv("CELERY_TIMEZONE") or DEFAULT_TIMEZONE

celery_app = Celery("jozvesaz", broker=_broker_url, backend=_backend_url)
celery_app.conf.update(
    task_default_queue=_default_queue,
    accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
    timezone=_timezone,
    enable_utc=_timezone.upper() == "UTC",
)


TRANSCRIBE_AUDIO_TASK_NAME = "jozvesaz.tasks.transcribe_audio"


def enqueue_transcription(*, task_id: str, file_path: str) -> AsyncResult:
    """Send a transcription job to the Celery worker queue."""

    payload: dict[str, Any] = {"task_id": task_id, "file_path": file_path}
    return celery_app.send_task(TRANSCRIBE_AUDIO_TASK_NAME, kwargs=payload)


__all__ = ["celery_app", "enqueue_transcription", "TRANSCRIBE_AUDIO_TASK_NAME"]
