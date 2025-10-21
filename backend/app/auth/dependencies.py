"""Reusable FastAPI dependencies for authentication."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlmodel import Session

from ..db import get_session
from ..models import User
from .jwt import ACCESS_TOKEN_COOKIE_NAME, decode_access_token


async def get_current_user(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> User:
    """Resolve the currently authenticated user from the httpOnly cookie."""

    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_access_token(token)
    except JWTError as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    try:
        user_id = UUID(str(subject))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return user


__all__ = ["get_current_user"]
