#!/usr/bin/env bash
#
# Provision and persistently mount a large storage volume at /storage.
#
# Usage:
#   sudo ./mount_storage_volume.sh <block-device> [mount-point] [owner] [group] [mode]
#
# Example:
#   sudo ./mount_storage_volume.sh /dev/sdc /storage appuser appgroup 770
#
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: sudo ./mount_storage_volume.sh <block-device> [mount-point] [owner] [group] [mode]

Arguments:
  <block-device>  Required. Block device that holds the 100 TB volume (e.g. /dev/sdc).
  [mount-point]   Optional. Default: /storage.
  [owner]         Optional. Owner for created directories. Default: root.
  [group]         Optional. Group for created directories. Default: root.
  [mode]          Optional. Permissions in octal for uploads/ and results/ directories. Default: 770.

Notes:
  * The device will be formatted with XFS if no filesystem is present.
  * The mount is added to /etc/fstab for persistence.
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
MOUNT_POINT="${2:-/storage}"
OWNER="${3:-root}"
GROUP="${4:-root}"
MODE="${5:-770}"

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
FSTYPE=$(blkid -s TYPE -o value "$DEVICE" || true)

if [[ -z "$UUID" ]]; then
  echo "[INFO] No filesystem detected on $DEVICE. Creating XFS filesystem..."
  if ! command -v mkfs.xfs >/dev/null 2>&1; then
    echo "[INFO] Installing xfsprogs package..."
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y xfsprogs
  fi
  mkfs.xfs -f "$DEVICE"
  UUID=$(blkid -s UUID -o value "$DEVICE")
  FSTYPE=$(blkid -s TYPE -o value "$DEVICE")
fi

if [[ -z "$FSTYPE" ]]; then
  echo "[ERROR] Unable to determine filesystem type for $DEVICE." >&2
  exit 1
fi

mkdir -p "$MOUNT_POINT"

if ! grep -q "UUID=$UUID" /etc/fstab; then
  echo "[INFO] Adding entry to /etc/fstab for $MOUNT_POINT"
  echo "UUID=$UUID $MOUNT_POINT $FSTYPE defaults,nofail 0 2" >> /etc/fstab
fi

if ! mountpoint -q "$MOUNT_POINT"; then
  echo "[INFO] Mounting $MOUNT_POINT"
  mount "$MOUNT_POINT"
fi

for dir in uploads results; do
  install -d -o "$OWNER" -g "$GROUP" -m "$MODE" "$MOUNT_POINT/$dir"
  echo "[INFO] Ensured $MOUNT_POINT/$dir exists with owner $OWNER:$GROUP and mode $MODE"
done

echo "[SUCCESS] $DEVICE mounted at $MOUNT_POINT with uploads/ and results/ directories configured."
