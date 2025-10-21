"""JSON Web Token helpers built on python-jose."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY", JWT_SECRET_KEY)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))
ACCESS_TOKEN_COOKIE_NAME = os.getenv("ACCESS_TOKEN_COOKIE_NAME", "access_token")
REFRESH_TOKEN_COOKIE_NAME = os.getenv("REFRESH_TOKEN_COOKIE_NAME", "refresh_token")

ACCESS_TOKEN_EXPIRE_SECONDS = ACCESS_TOKEN_EXPIRE_MINUTES * 60
REFRESH_TOKEN_EXPIRE_SECONDS = REFRESH_TOKEN_EXPIRE_MINUTES * 60


class TokenType:
    """Supported JWT token types."""

    ACCESS = "access"
    REFRESH = "refresh"


def _create_token(*, subject: str, expires_delta: timedelta, token_type: str, secret_key: str) -> str:
    """Create a signed JWT for ``subject``."""

    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + expires_delta,
        "type": token_type,
    }
    return jwt.encode(payload, secret_key, algorithm=JWT_ALGORITHM)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a short-lived access token."""

    delta = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(
        subject=subject,
        expires_delta=delta,
        token_type=TokenType.ACCESS,
        secret_key=JWT_SECRET_KEY,
    )


def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a long-lived refresh token."""

    delta = expires_delta or timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    return _create_token(
        subject=subject,
        expires_delta=delta,
        token_type=TokenType.REFRESH,
        secret_key=JWT_REFRESH_SECRET_KEY,
    )


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate an access token."""

    return _decode_token(token=token, expected_type=TokenType.ACCESS, secret_key=JWT_SECRET_KEY)


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """Decode and validate a refresh token."""

    return _decode_token(token=token, expected_type=TokenType.REFRESH, secret_key=JWT_REFRESH_SECRET_KEY)


def _decode_token(*, token: str, expected_type: str, secret_key: str) -> Dict[str, Any]:
    """Decode ``token`` ensuring it matches ``expected_type``."""

    payload = jwt.decode(token, secret_key, algorithms=[JWT_ALGORITHM])
    token_type = payload.get("type")
    if token_type != expected_type:
        raise JWTError("Token type mismatch")
    return payload


__all__ = [
    "ACCESS_TOKEN_COOKIE_NAME",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "ACCESS_TOKEN_EXPIRE_SECONDS",
    "JWTError",
    "REFRESH_TOKEN_COOKIE_NAME",
    "REFRESH_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_SECONDS",
    "TokenType",
    "create_access_token",
    "create_refresh_token",
    "decode_access_token",
    "decode_refresh_token",
]
