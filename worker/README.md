# Jozvesaz Worker

This package hosts the Celery tasks executed by the worker service. It relies on
shared backend modules (database models, Celery configuration) that live in the
`backend/` directory at the repository root.

## Running locally

1. Ensure the repository-level `.env` file is populated with working database
   and Redis connection strings.
2. Populate `worker/.env` with overrides specific to the worker process.
3. Install dependencies and start the worker:

   ```bash
   cd worker
   python -m venv .venv
   source .venv/bin/activate
   pip install -e .[dev]
   celery -A worker.app.tasks worker --loglevel=info
   ```

## Storage layout

The worker expects uploads to be located under `${STORAGE_ROOT}/uploads` and
writes transcription results to `${STORAGE_ROOT}/results`. By default
`STORAGE_ROOT` falls back to `/storage` so the folders resolve to
`/storage/uploads` and `/storage/results`.
