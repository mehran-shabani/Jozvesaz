#!/usr/bin/env bash
#
# Install and secure Redis on localhost:6379.
#
# Usage:
#   sudo ./install_secure_redis.sh <redis-password> [bind-address] [port]
#
# Example:
#   sudo ./install_secure_redis.sh "Sup3rSecret" 127.0.0.1 6379
#
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: sudo ./install_secure_redis.sh <redis-password> [bind-address] [port]

Arguments:
  <redis-password>  Required. Password that clients must use when authenticating to Redis.
  [bind-address]    Optional. Address to bind Redis to. Default: 127.0.0.1.
  [port]            Optional. Redis TCP port. Default: 6379.

Notes:
  * The script must run as root.
  * Redis will be configured in protected mode and supervised by systemd.
USAGE
}

if [[ ${EUID} -ne 0 ]]; then
  echo "[ERROR] This script must be run as root." >&2
  usage
  exit 1
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

PASSWORD="$1"
BIND_ADDRESS="${2:-127.0.0.1}"
PORT="${3:-6379}"

if [[ -z "$PASSWORD" ]]; then
  echo "[ERROR] Redis password cannot be empty." >&2
  exit 1
fi

echo "[INFO] Installing Redis server..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y redis-server

CONF_FILE="/etc/redis/redis.conf"

if [[ ! -f "$CONF_FILE" ]]; then
  echo "[ERROR] Redis configuration file not found at $CONF_FILE" >&2
  exit 1
fi

python3 - "$CONF_FILE" "$BIND_ADDRESS" "$PORT" "$PASSWORD" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
bind_address, port, password = sys.argv[2:5]

settings = {
    "bind": bind_address,
    "port": port,
    "requirepass": password,
    "protected-mode": "yes",
    "supervised": "systemd",
}

lines = path.read_text().splitlines()
patterns = {key: re.compile(rf"^\s*#?\s*{re.escape(key)}\b", re.IGNORECASE) for key in settings}
seen = {key: False for key in settings}
updated_lines = []

for line in lines:
    replaced = False
    for key, pattern in patterns.items():
        if pattern.match(line):
            updated_lines.append(f"{key} {settings[key]}")
            seen[key] = True
            replaced = True
            break
    if not replaced:
        updated_lines.append(line)

with path.open('w') as fh:
    fh.write("\n".join(updated_lines) + "\n")

with path.open('a') as fh:
    for key, was_seen in seen.items():
        if not was_seen:
            fh.write(f"{key} {settings[key]}\n")
PY

chown redis:redis "$CONF_FILE"
chmod 640 "$CONF_FILE"

systemctl enable redis-server
systemctl restart redis-server

cat <<INFO
[SUCCESS] Redis is installed and secured.
  * Bind address: $BIND_ADDRESS
  * Port: $PORT
  * Password stored in $CONF_FILE (requirepass)
INFO
