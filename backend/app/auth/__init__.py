"""Authentication utilities and routes for the backend service."""

from .dependencies import get_current_user
from .router import router

__all__ = ["get_current_user", "router"]
