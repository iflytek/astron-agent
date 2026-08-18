#!/usr/bin/env bash
set -Eeuo pipefail

rootfs_url=https://archive.spacemit.com/bianbu-base/bianbu-base-24.04.1-base-riscv64.tar.gz
rootfs_sha256=a3f8ca97d8c399c05f8284adad8cc26980e3b7fe63e85026396d29174a9a554c
image=astron/bianbu-base:24.04.1-riscv64

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
rootfs="$workdir/bianbu-base.tar.gz"

curl -4 -fL --retry 5 -o "$rootfs" "$rootfs_url"
echo "$rootfs_sha256  $rootfs" | sha256sum -c -
docker import --platform linux/riscv64 "$rootfs" "$image" >/dev/null

test "$(docker run --rm "$image" /bin/uname -m)" = riscv64
echo "Imported and verified $image"
