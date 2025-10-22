#!/usr/bin/env bash
set -euo pipefail

# Allow callers to extend the default command by passing additional arguments.
CMD=("celery" "-A" "worker.app.tasks" "worker" "--loglevel=${CELERY_LOG_LEVEL:-info}" "--concurrency=2")

if [[ $# -gt 0 ]]; then
  CMD+=("$@")
fi

exec "${CMD[@]}"
