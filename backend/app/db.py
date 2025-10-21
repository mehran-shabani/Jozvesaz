"""Database configuration and session management for the backend service."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jozvesaz.db")
ECHO_SQL = os.getenv("SQL_ECHO", "0") == "1"

engine = create_engine(
    DATABASE_URL,
    echo=ECHO_SQL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


def init_db() -> None:
    """Create database tables for all registered SQLModel models."""

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Provide a SQLModel session for use with FastAPI dependencies."""

    with Session(engine) as session:
        yield session


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Context manager variant for running blocks of work within a session."""

    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
