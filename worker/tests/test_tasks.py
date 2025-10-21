from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path

import pytest
from sqlmodel import SQLModel


@pytest.fixture()
def worker_environment(tmp_path, monkeypatch):
    db_file = tmp_path / "worker.db"
    storage_root = tmp_path / "storage"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    monkeypatch.setenv("STORAGE_ROOT", str(storage_root))

    SQLModel.metadata.clear()
    for module in ("worker.app.tasks", "backend.app.db", "backend.app.models"):
        sys.modules.pop(module, None)

    db_module = importlib.import_module("backend.app.db")
    models_module = importlib.import_module("backend.app.models")
    db_module.init_db()
    tasks_module = importlib.import_module("worker.app.tasks")

    storage_root.mkdir(parents=True, exist_ok=True)

    yield tasks_module, models_module, db_module

    SQLModel.metadata.clear()


def _create_user_and_task(db_module, models_module):
    with db_module.session_scope() as session:
        user = models_module.User(
            email="worker@example.com",
            hashed_password="hashed",
            full_name="Worker",
        )
        session.add(user)
        session.flush()

        task = models_module.Task(title="Transcribe", description="Sample", owner_id=user.id)
        session.add(task)
        session.flush()
        task_id = task.id

    return task_id


def test_transcribe_audio_completes_successfully(worker_environment):
    tasks_module, models_module, db_module = worker_environment
    task_id = _create_user_and_task(db_module, models_module)

    uploads_dir = Path(os.environ["STORAGE_ROOT"]) / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    source = uploads_dir / "input.txt"
    source.write_text("hello world", encoding="utf-8")

    result = tasks_module.transcribe_audio.run(task_id=str(task_id), file_path=str(source))
    assert result["task_id"] == str(task_id)
    result_path = Path(result["result_path"])
    assert result_path.exists()
    assert "hello world" in result_path.read_text(encoding="utf-8")

    with db_module.session_scope() as session:
        updated = session.get(models_module.Task, task_id)
        assert updated is not None
        assert updated.status == models_module.TaskStatus.COMPLETED
        assert updated.result_path == str(result_path)
        assert updated.completed_at is not None
        assert updated.completed_at.tzinfo is not None


def test_transcribe_audio_marks_failure(worker_environment):
    tasks_module, models_module, db_module = worker_environment
    task_id = _create_user_and_task(db_module, models_module)

    missing_file = Path(os.environ["STORAGE_ROOT"]) / "uploads" / "missing.wav"

    with pytest.raises(FileNotFoundError):
        tasks_module.transcribe_audio.run(task_id=str(task_id), file_path=str(missing_file))

    with db_module.session_scope() as session:
        updated = session.get(models_module.Task, task_id)
        assert updated is not None
        assert updated.status == models_module.TaskStatus.FAILED
        assert updated.result_path is None
        assert updated.completed_at is None
