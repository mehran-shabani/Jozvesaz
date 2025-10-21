#!/usr/bin/env bash
#
# Configure PostgreSQL to store its data directory on a dedicated SSD.
#
# Usage:
#   sudo ./setup_postgresql_ssd.sh <block-device> [mount-point] [postgresql-version]
#
# Example:
#   sudo ./setup_postgresql_ssd.sh /dev/nvme1n1 /mnt/postgres 15
#
# The script will:
#   * Format the provided device if it has no filesystem.
#   * Mount it at the requested mount point (default: /mnt/postgres-ssd) and make the mount persistent.
#   * Install PostgreSQL via apt if it is not already present.
#   * Create a new PostgreSQL cluster whose data directory resides on the SSD.
#
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: sudo ./setup_postgresql_ssd.sh <block-device> [mount-point] [postgresql-version]

Arguments:
  <block-device>      Required. The path to the SSD block device (e.g. /dev/nvme1n1).
  [mount-point]       Optional. Where to mount the device. Default: /mnt/postgres-ssd.
  [postgresql-version] Optional. Version to install/configure. Default: 15.

Notes:
  * The script must run as root.
  * Existing PostgreSQL data will be re-created on the SSD. Back up your cluster before running this script.
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

DEVICE="$1"
MOUNT_POINT="${2:-/mnt/postgres-ssd}"
PG_VERSION="${3:-15}"

if [[ ! -b "$DEVICE" ]]; then
  echo "[ERROR] $DEVICE is not a block device." >&2
  exit 1
fi

if ! command -v blkid >/dev/null 2>&1; then
  echo "[INFO] Installing util-linux for blkid..."
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y util-linux
fi

UUID=$(blkid -s UUID -o value "$DEVICE" || true)
if [[ -z "$UUID" ]]; then
  echo "[INFO] No filesystem detected on $DEVICE. Creating ext4 filesystem..."
  mkfs.ext4 -F "$DEVICE"
  UUID=$(blkid -s UUID -o value "$DEVICE")
fi

if [[ ! -d "$MOUNT_POINT" ]]; then
  mkdir -p "$MOUNT_POINT"
fi

if ! grep -q "UUID=$UUID" /etc/fstab; then
  echo "[INFO] Adding entry to /etc/fstab for $MOUNT_POINT"
  echo "UUID=$UUID $MOUNT_POINT ext4 defaults,nofail 0 2" >> /etc/fstab
fi

if ! mountpoint -q "$MOUNT_POINT"; then
  echo "[INFO] Mounting $MOUNT_POINT"
  mount "$MOUNT_POINT"
fi

echo "[INFO] Ensuring PostgreSQL $PG_VERSION is installed..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y "postgresql-$PG_VERSION" postgresql-common

# Stop PostgreSQL if it's running.
if systemctl list-units --type=service --all | grep -q '^postgresql\.service'; then
  systemctl stop postgresql || true
fi
if command -v pg_ctlcluster >/dev/null 2>&1; then
  pg_ctlcluster "$PG_VERSION" main stop >/dev/null 2>&1 || true
fi

DATA_ROOT="$MOUNT_POINT/postgresql"
DATA_DIR="$DATA_ROOT/$PG_VERSION/main"

install -d -o postgres -g postgres "$DATA_ROOT"

if command -v pg_lsclusters >/dev/null 2>&1 && pg_lsclusters | awk '{print $1" "$2}' | grep -q "^$PG_VERSION main$"; then
  echo "[INFO] Dropping existing default cluster for PostgreSQL $PG_VERSION"
  pg_dropcluster --stop "$PG_VERSION" main
fi

echo "[INFO] Creating new PostgreSQL cluster with data dir $DATA_DIR"
pg_createcluster --datadir "$DATA_DIR" "$PG_VERSION" main

CONF_DIR="/etc/postgresql/$PG_VERSION/main"
CONF_FILE="$CONF_DIR/postgresql.conf"

if [[ ! -f "$CONF_FILE" ]]; then
  echo "[ERROR] PostgreSQL configuration file not found at $CONF_FILE" >&2
  exit 1
fi

if grep -Eq "^#?data_directory" "$CONF_FILE"; then
  sed -i "s|^#\?data_directory *=.*|data_directory = '$DATA_DIR'|" "$CONF_FILE"
else
  printf "\ndata_directory = '%s'\n" "$DATA_DIR" >> "$CONF_FILE"
fi

chown -R postgres:postgres "$MOUNT_POINT"
chmod 700 "$DATA_DIR"

echo "[INFO] Enabling and starting PostgreSQL"
systemctl enable postgresql
systemctl start postgresql

echo "[SUCCESS] PostgreSQL is configured to use $DATA_DIR on $DEVICE"
