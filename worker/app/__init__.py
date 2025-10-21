"""Celery worker application package for Jozvesaz."""

from __future__ import annotations

import sys
from pathlib import Path


def _ensure_backend_on_path() -> None:
    """Ensure the repository root is available for backend imports."""

    repo_root = Path(__file__).resolve().parents[2]
    repo_str = str(repo_root)
    if repo_str not in sys.path:
        sys.path.insert(0, repo_str)


_ensure_backend_on_path()

__all__ = ["tasks"]
