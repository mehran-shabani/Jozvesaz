from __future__ import annotations

from pathlib import Path
from typing import Iterator
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from backend.app.auth.dependencies import get_current_user
from backend.app.db import get_session
from backend.app.models import Task, User
from backend.app.routers.tasks import router


@pytest.fixture()
def engine() -> Iterator:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    try:
        yield engine
    finally:
        SQLModel.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture()
def user(engine) -> User:
    with Session(engine) as session:
        user = User(email="owner@example.com", hashed_password="hashed", full_name="Owner")
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


@pytest.fixture()
def other_user(engine) -> User:
    with Session(engine) as session:
        user = User(email="other@example.com", hashed_password="hashed", full_name="Other")
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


@pytest.fixture()
def app(engine, user: User, task_queue: list[dict[str, str]]) -> FastAPI:
    app = FastAPI()
    app.include_router(router)

    def get_session_override() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    async def get_current_user_override() -> User:
        return user

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = get_current_user_override
    return app


@pytest.fixture()
def task_queue(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, str]]:
    calls: list[dict[str, str]] = []

    class _Result:
        id = "fake-task-id"

    def _enqueue(*, task_id: str, file_path: str):
        calls.append({"task_id": task_id, "file_path": file_path})
        return _Result()

    monkeypatch.setattr("backend.app.routers.tasks.enqueue_transcription", _enqueue)
    return calls


@pytest.fixture()
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client


def _list_uploads(root: Path) -> list[Path]:
    upload_dir = root / "uploads"
    if not upload_dir.exists():
        return []
    return list(upload_dir.iterdir())


def test_create_task_persists_file_and_enqueues_job(
    client: TestClient,
    engine,
    task_queue: list[dict[str, str]],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("STORAGE_ROOT", str(tmp_path))

    response = client.post(
        "/api/v1/tasks",
        data={"title": "Example", "description": "Process me"},
        files={"file": ("sample.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["title"] == "Example"

    with Session(engine) as session:
        statement = select(Task).where(Task.id == UUID(body["id"]))
        task = session.exec(statement).first()
        assert task is not None
        assert task.description == "Process me"

    uploads = _list_uploads(tmp_path)
    assert len(uploads) == 1
    stored_file = uploads[0]
    assert stored_file.read_bytes() == b"hello"

    assert task_queue
    message = task_queue[0]
    assert message["task_id"] == body["id"]
    assert message["file_path"] == str(stored_file)


def test_list_tasks_returns_only_current_user_tasks(
    client: TestClient,
    engine,
    user: User,
    other_user: User,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("STORAGE_ROOT", str(tmp_path))

    with Session(engine) as session:
        owned = Task(title="Mine", description="A", owner_id=user.id)
        other = Task(title="Not mine", description="B", owner_id=other_user.id)
        session.add(owned)
        session.add(other)
        session.commit()

    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "Mine"


def test_get_task_returns_404_for_missing_or_foreign_task(
    client: TestClient,
    engine,
    user: User,
    other_user: User,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("STORAGE_ROOT", str(tmp_path))

    with Session(engine) as session:
        owned = Task(title="Mine", description=None, owner_id=user.id)
        other = Task(title="Other", description=None, owner_id=other_user.id)
        session.add(owned)
        session.add(other)
        session.commit()
        session.refresh(owned)
        session.refresh(other)

    ok_response = client.get(f"/api/v1/tasks/{owned.id}")
    assert ok_response.status_code == 200
    assert ok_response.json()["id"] == str(owned.id)

    missing = client.get("/api/v1/tasks/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404

    forbidden = client.get(f"/api/v1/tasks/{other.id}")
    assert forbidden.status_code == 404
