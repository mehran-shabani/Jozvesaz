"""Runtime monitoring utilities for the Celery worker."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import threading
from dataclasses import dataclass
from typing import Iterable

from celery import signals

logger = logging.getLogger(__name__)

_DEFAULT_INTERVAL_SECONDS = 30.0
_DEFAULT_WARNING_RATIO = 0.9


def _env_float(name: str, default: float) -> float:
    """Read a float from the environment, falling back to ``default``."""

    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw)
    except ValueError:
        logger.warning("Invalid float value '%s' for %s; using default %s", raw, name, default)
        return default


def _env_bool(name: str, default: bool = True) -> bool:
    """Read a boolean from the environment for feature toggles."""

    raw = os.getenv(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    logger.warning("Invalid boolean value '%s' for %s; using default %s", raw, name, default)
    return default


@dataclass
class GPUMemoryUsage:
    """Represents memory usage for a single GPU."""

    index: int
    used_mb: int
    total_mb: int

    @property
    def utilization(self) -> float:
        if self.total_mb == 0:
            return 0.0
        return self.used_mb / self.total_mb


@dataclass
class RAMUsage:
    """Represents system RAM usage."""

    used_mb: int
    total_mb: int

    @property
    def utilization(self) -> float:
        if self.total_mb == 0:
            return 0.0
        return self.used_mb / self.total_mb


def _read_ram_usage() -> RAMUsage | None:
    """Return the current RAM usage derived from ``/proc/meminfo``."""

    try:
        with open("/proc/meminfo", "r", encoding="utf-8") as handle:
            meminfo = handle.readlines()
    except OSError:
        logger.debug("Unable to read /proc/meminfo; skipping RAM monitoring", exc_info=True)
        return None

    metrics: dict[str, int] = {}
    for line in meminfo:
        try:
            key, value = line.split(":", 1)
            tokens = value.strip().split()
            if not tokens:
                continue
            metrics[key] = int(tokens[0])
        except ValueError:
            continue

    total_kb = metrics.get("MemTotal")
    available_kb = metrics.get("MemAvailable", metrics.get("MemFree"))
    if total_kb is None or available_kb is None:
        return None

    used_kb = max(total_kb - available_kb, 0)
    return RAMUsage(used_mb=used_kb // 1024, total_mb=total_kb // 1024)


def _query_nvidia_smi() -> Iterable[GPUMemoryUsage]:
    """Yield GPU memory usage records using ``nvidia-smi`` if available."""

    executable = shutil.which("nvidia-smi")
    if executable is None:
        return []

    try:
        result = subprocess.run(
            [
                executable,
                "--query-gpu=index,memory.used,memory.total",
                "--format=csv,noheader,nounits",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        logger.debug("Unable to query nvidia-smi; skipping GPU monitoring", exc_info=True)
        return []

    usages: list[GPUMemoryUsage] = []
    for line in result.stdout.strip().splitlines():
        parts = [part.strip() for part in line.split(",") if part.strip()]
        if len(parts) != 3:
            continue
        try:
            index = int(parts[0])
            used_mb = int(parts[1])
            total_mb = int(parts[2])
        except ValueError:
            continue
        usages.append(GPUMemoryUsage(index=index, used_mb=used_mb, total_mb=total_mb))
    return usages


class MemoryMonitor:
    """Background thread that periodically reports memory pressure."""

    def __init__(
        self,
        *,
        interval_seconds: float = _DEFAULT_INTERVAL_SECONDS,
        ram_warning_ratio: float = _DEFAULT_WARNING_RATIO,
        vram_warning_ratio: float = _DEFAULT_WARNING_RATIO,
        enabled: bool = True,
    ) -> None:
        self.interval_seconds = interval_seconds
        self.ram_warning_ratio = ram_warning_ratio
        self.vram_warning_ratio = vram_warning_ratio
        self.enabled = enabled
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._stop_event = threading.Event()

    def start(self) -> None:
        """Start the background monitor if enabled."""

        if not self.enabled:
            logger.debug("Memory monitoring is disabled via configuration")
            return

        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run, name="memory-monitor", daemon=True)
            self._thread.start()
            logger.info(
                "Started memory monitor thread (interval=%ss, ram_warning_ratio=%.2f, vram_warning_ratio=%.2f)",
                self.interval_seconds,
                self.ram_warning_ratio,
                self.vram_warning_ratio,
            )

    def stop(self) -> None:
        """Stop the background monitor."""

        with self._lock:
            if not self._thread:
                return
            self._stop_event.set()
            self._thread.join(timeout=self.interval_seconds)
            self._thread = None
            logger.info("Stopped memory monitor thread")

    def _run(self) -> None:
        while not self._stop_event.is_set():
            self._emit_snapshot()
            self._stop_event.wait(self.interval_seconds)

    def _emit_snapshot(self) -> None:
        ram_usage = _read_ram_usage()
        if ram_usage:
            if ram_usage.utilization >= self.ram_warning_ratio:
                logger.warning(
                    "High RAM usage detected: %s/%s MiB (%.1f%%)",
                    ram_usage.used_mb,
                    ram_usage.total_mb,
                    ram_usage.utilization * 100,
                )
            else:
                logger.debug(
                    "RAM usage: %s/%s MiB (%.1f%%)",
                    ram_usage.used_mb,
                    ram_usage.total_mb,
                    ram_usage.utilization * 100,
                )

        gpu_usages = list(_query_nvidia_smi())
        for usage in gpu_usages:
            if usage.utilization >= self.vram_warning_ratio:
                logger.warning(
                    "High GPU memory usage detected on GPU %s: %s/%s MiB (%.1f%%)",
                    usage.index,
                    usage.used_mb,
                    usage.total_mb,
                    usage.utilization * 100,
                )
            else:
                logger.debug(
                    "GPU %s memory usage: %s/%s MiB (%.1f%%)",
                    usage.index,
                    usage.used_mb,
                    usage.total_mb,
                    usage.utilization * 100,
                )


def _create_memory_monitor() -> MemoryMonitor:
    interval = _env_float("MEMORY_MONITOR_INTERVAL_SECONDS", _DEFAULT_INTERVAL_SECONDS)
    ram_ratio = _env_float("MEMORY_MONITOR_RAM_RATIO", _DEFAULT_WARNING_RATIO)
    vram_ratio = _env_float("MEMORY_MONITOR_VRAM_RATIO", _DEFAULT_WARNING_RATIO)
    enabled = _env_bool("ENABLE_MEMORY_MONITORING", True)
    return MemoryMonitor(
        interval_seconds=interval,
        ram_warning_ratio=ram_ratio,
        vram_warning_ratio=vram_ratio,
        enabled=enabled,
    )


memory_monitor = _create_memory_monitor()


@signals.worker_ready.connect
def _start_monitor_on_worker_ready(**_: object) -> None:
    """Start monitoring after the Celery worker has initialized."""

    memory_monitor.start()


__all__ = ["memory_monitor", "MemoryMonitor"]
