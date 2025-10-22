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
   ./entrypoint.sh
   ```

   The entrypoint pins the Celery worker to `--concurrency=2`, which keeps two
   task slots available. This value was chosen to balance CPU-bound preprocessing
   with GPU-bound inference: one process can stream audio to the model while the
   other finalizes a previous job, yet the memory footprint remains low enough to
   avoid oversubscribing VRAM on consumer GPUs.

## Transcription runtime configuration

The worker loads the transcription model once per process to avoid repeated
warm-up latency. You can tune the model bootstrap with the following
environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `TRANSCRIPTION_MODEL_NAME` | Model identifier to load. | `base` |
| `TRANSCRIPTION_DEVICE_INDEX` | Explicit GPU index (set to blank to auto-select). | auto |
| `TRANSCRIPTION_COMPUTE_TYPE` | Precision/mode hint passed to the backend runtime. | `default` |
| `TRANSCRIPTION_LOAD_IN_8BIT` | Enable low-memory 8-bit loading when supported. | `false` |

## Memory monitoring

To guard against OOM conditions the worker starts a lightweight monitor thread
that periodically samples system RAM and (when `nvidia-smi` is available) GPU
memory usage. Thresholds are configurable through environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `MEMORY_MONITOR_INTERVAL_SECONDS` | Sampling interval in seconds. | `30` |
| `MEMORY_MONITOR_RAM_RATIO` | Emit a warning when RAM usage exceeds this ratio. | `0.9` |
| `MEMORY_MONITOR_VRAM_RATIO` | Emit a warning when GPU VRAM exceeds this ratio. | `0.9` |
| `ENABLE_MEMORY_MONITORING` | Disable monitoring entirely when set to `false`. | `true` |

## Storage layout

The worker expects uploads to be located under `${STORAGE_ROOT}/uploads` and
writes transcription results to `${STORAGE_ROOT}/results`. By default the
storage root resolves to the repository-level `storage/` directory, so relative
paths produced by the backend API are discovered automatically. You can
override `STORAGE_ROOT` with any absolute path shared between the backend and
worker processes.
