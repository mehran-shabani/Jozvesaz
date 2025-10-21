"""FastAPI router providing authentication endpoints."""

from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import User
from .dependencies import get_current_user
from .jwt import (
    ACCESS_TOKEN_COOKIE_NAME,
    ACCESS_TOKEN_EXPIRE_SECONDS,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_EXPIRE_SECONDS,
    create_access_token,
    create_refresh_token,
)
from .passwords import hash_password, verify_password

try:  # pragma: no cover - compatibility shim for Pydantic v1/v2
    from pydantic import BaseModel, EmailStr, ConfigDict
except ImportError:  # pragma: no cover
    from pydantic import BaseModel, EmailStr  # type: ignore

    ConfigDict = None  # type: ignore


class UserPublic(BaseModel):
    """Representation of a user returned by auth endpoints."""

    id: UUID
    email: EmailStr
    full_name: Optional[str] = None

    if "ConfigDict" in globals() and ConfigDict:  # type: ignore[truthy-function]
        model_config = ConfigDict(from_attributes=True)  # type: ignore[call-arg]
    else:
        class Config:  # pragma: no cover - only executed on Pydantic v1
            orm_mode = True


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


router = APIRouter(prefix="/auth", tags=["auth"])


def _serialize_user(user: User) -> UserPublic:
    """Serialize ``user`` into the public response model."""

    if hasattr(UserPublic, "model_validate"):
        return UserPublic.model_validate(user)  # type: ignore[attr-defined]
    return UserPublic.from_orm(user)  # type: ignore[call-arg]


def _set_auth_cookies(response: Response, *, user_id: UUID) -> None:
    access_token = create_access_token(str(user_id))
    refresh_token = create_refresh_token(str(user_id))

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_SECONDS,
        secure=False,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_SECONDS,
        secure=False,
        samesite="lax",
        path="/",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserPublic)
def register(
    payload: RegisterRequest,
    session: Annotated[Session, Depends(get_session)],
    response: Response,
) -> UserPublic:
    """Register a new user and issue auth cookies."""

    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    _set_auth_cookies(response, user_id=user.id)
    return _serialize_user(user)


@router.post("/login", response_model=UserPublic)
def login(
    payload: LoginRequest,
    session: Annotated[Session, Depends(get_session)],
    response: Response,
) -> UserPublic:
    """Authenticate a user via email and password."""

    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    _set_auth_cookies(response, user_id=user.id)
    return _serialize_user(user)


@router.get("/me", response_model=UserPublic)
async def read_current_user(current_user: Annotated[User, Depends(get_current_user)]) -> UserPublic:
    """Return the authenticated user based on the auth dependency."""

    return _serialize_user(current_user)
