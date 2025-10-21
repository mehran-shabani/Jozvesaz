# Jozvesaz

This repository hosts the frontend, backend, worker, and infrastructure configuration for the Jozvesaz platform.

## Environment configuration

1. Copy `.env.example` at the repository root to `.env` and replace all placeholder values with strong credentials that match your deployment target.
2. Review each service specific file (`frontend/.env.local`, `backend/.env`, `worker/.env`, `infrastructure/postgres/.env`, and `infrastructure/redis/.env`). Update any defaults so that they line up with your hostnames, ports, and secrets.
3. Ensure that the host path exposed to the containers through `${STORAGE_VOLUME_PATH}` exists. By default the stack expects a volume to be mounted at `/storage` (see `infrastructure/mount_storage_volume.sh` for automation of the mount).

> **Tip:** Keep the secret-bearing `.env` files out of version control. The checked-in examples are safe defaults only.

## Running the stack with Docker Compose

1. Install Docker Engine and the Compose plugin on the target machine.
2. Make sure the persistent storage volume is mounted. The containers receive the mount at `/storage`, while PostgreSQL keeps its database files in the named `postgres_data` volume managed by Docker.
3. From the repository root, bring the stack online:
   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d
   ```
4. Inspect logs or follow them for specific services:
   ```bash
   docker compose -f infrastructure/docker-compose.yml logs -f backend
   ```
5. To apply configuration changes, rebuild services and restart the stack:
   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d --build
   ```
6. When you need to stop everything:
   ```bash
   docker compose -f infrastructure/docker-compose.yml down
   ```

### Service wiring

| Service   | Ports | Depends on        | Environment files                                           |
|-----------|-------|-------------------|-------------------------------------------------------------|
| frontend  | 3000  | backend           | `../.env`, `../frontend/.env.local`                         |
| backend   | 4000  | postgres, redis   | `../.env`, `../backend/.env`                                |
| worker    | –     | backend, redis    | `../.env`, `../worker/.env`                                 |
| redis     | 6379  | –                 | `./redis/.env`                                              |
| postgres  | 5432  | –                 | `./postgres/.env`                                           |

The Compose file automatically loads the repository-level `.env` alongside each service-specific file, so shared values such as connection strings stay consistent across the stack.

## Running services directly with systemd (without Docker)

For bare-metal or VM deployments where you prefer not to use containers, you can run the same processes with `systemd` units. The high-level workflow is:

1. Provision dependencies on the host (language runtimes, package managers, etc.) so that `frontend`, `backend`, and `worker` can run with their respective `start` commands.
2. Create a shared environment file at `/etc/jozvesaz.env` (or similar) that mirrors the contents of the repository `.env`, adjusting hostnames to `localhost` when services run on the same machine.
3. Mount the `/storage` volume (or update `STORAGE_ROOT` and `STORAGE_VOLUME_PATH` to point to an alternative path) and ensure the backend and worker processes can read/write inside `uploads/` and `results/`.
4. Install PostgreSQL and Redis natively (you can adapt the helper scripts under `infrastructure/` for guided setup).
5. Author systemd service units that reference the working directories and environment files for each process. Example template:

   ```ini
   [Unit]
   Description=Jozvesaz Backend API
   After=network.target postgresql.service redis.service

   [Service]
   Type=simple
   WorkingDirectory=/opt/jozvesaz/backend
   EnvironmentFile=/etc/jozvesaz.env
   EnvironmentFile=/opt/jozvesaz/backend/.env
   ExecStart=/usr/bin/env bash -lc 'npm run start'
   Restart=on-failure
   RestartSec=5s

   [Install]
   WantedBy=multi-user.target
   ```

   Duplicate the pattern for the worker (adjust `ExecStart` to your queue runner command) and for the frontend web server.
6. Enable and start each unit:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now jozvesaz-backend.service jozvesaz-worker.service jozvesaz-frontend.service
   ```
7. Use `journalctl -u <service>` to follow logs and `systemctl restart <service>` when rolling out updates.

This approach keeps configuration management consistent across containerized and host-based deployments by reusing the same `.env` files and storage layout.
