from __future__ import annotations

from typing import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from backend.app.auth import router
from backend.app.auth.passwords import hash_password, verify_password
from backend.app.db import get_session
from backend.app.models import User


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
def app(engine) -> FastAPI:
    app = FastAPI()
    app.include_router(router)

    def get_session_override() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_session_override
    return app


@pytest.fixture()
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client


def test_register_creates_user_and_sets_cookies(client: TestClient, engine) -> None:
    payload = {"email": "alice@example.com", "password": "secret123", "full_name": "Alice"}

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == payload["email"]
    assert response.cookies.get("access_token")
    assert response.cookies.get("refresh_token")

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == payload["email"])).first()
        assert user is not None
        assert user.full_name == payload["full_name"]
        assert user.hashed_password != payload["password"]
        assert verify_password(payload["password"], user.hashed_password)


def test_login_succeeds_with_valid_credentials(client: TestClient, engine) -> None:
    hashed = hash_password("topsecret")
    with Session(engine) as session:
        user = User(email="bob@example.com", full_name="Bob", hashed_password=hashed)
        session.add(user)
        session.commit()

    response = client.post("/auth/login", json={"email": "bob@example.com", "password": "topsecret"})

    assert response.status_code == 200
    assert response.json()["email"] == "bob@example.com"
    assert response.cookies.get("access_token")
    assert response.cookies.get("refresh_token")


def test_auth_dependency_requires_cookie(client: TestClient) -> None:
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_auth_dependency_allows_authenticated_requests(client: TestClient) -> None:
    payload = {"email": "carol@example.com", "password": "secret456"}
    register_response = client.post("/auth/register", json=payload)
    assert register_response.status_code == 201

    me_response = client.get("/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == payload["email"]
