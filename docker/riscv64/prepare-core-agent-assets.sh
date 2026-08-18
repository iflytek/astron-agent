#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cache_dir="$script_dir/.cache/core-agent"
mkdir -p "$cache_dir"

download() {
  local filename=$1
  local sha256=$2
  local url=$3
  local destination="$cache_dir/$filename"
  local temporary="$destination.part"

  if [[ -f "$destination" ]] && echo "$sha256  $destination" | sha256sum -c - >/dev/null; then
    echo "Verified cached $filename"
    return
  fi

  curl -4 -fL --retry 5 --connect-timeout 20 --continue-at - \
    -o "$temporary" "$url"
  echo "$sha256  $temporary" | sha256sum -c -
  mv "$temporary" "$destination"
}

download \
  librdkafka-2.11.1.tar.gz \
  a2c87186b081e2705bb7d5338d5a01bc88d43273619b372ccb7bb0d264d0ca9f \
  https://codeload.github.com/confluentinc/librdkafka/tar.gz/refs/tags/v2.11.1

download \
  confluent_kafka-2.11.1.tar.gz \
  a9366d9dc07a527ed0dcef9c24ba38238cf9dc63c3f53b79da15d45ce4459166 \
  https://pypi.tuna.tsinghua.edu.cn/packages/e1/e4/cd2dc58cd583788a362c2d59d179a6537b81c3bf70c6a1907c508117ca77/confluent_kafka-2.11.1.tar.gz

download \
  uv-0.12.5-riscv64.tar.gz \
  2a6fe4a685225082d82f8afba169d038d669f85bf6cff7f5f733079a7b7282d5 \
  https://github.com/astral-sh/uv/releases/download/0.12.5/uv-riscv64gc-unknown-linux-gnu.tar.gz

download \
  aiohttp-3.11.14-cp312-cp312-linux_riscv64.whl \
  e45d8935d09e6d760486c544c1fd55f4f316410c259aefafaadb872fb36e228a \
  https://git.spacemit.com/api/v4/projects/33/packages/pypi/files/e45d8935d09e6d760486c544c1fd55f4f316410c259aefafaadb872fb36e228a/aiohttp-3.11.14-cp312-cp312-linux_riscv64.whl

download \
  grpcio-1.75.1-cp312-cp312-linux_riscv64.whl \
  b8d38a13fb82911b0afc77b228d8ebbf36fee1fd1411065d7f5a8558093c9c12 \
  https://git.spacemit.com/api/v4/projects/33/packages/pypi/files/b8d38a13fb82911b0afc77b228d8ebbf36fee1fd1411065d7f5a8558093c9c12/grpcio-1.75.1-cp312-cp312-linux_riscv64.whl

download \
  jiter-0.9.0-cp312-cp312-linux_riscv64.whl \
  f89e843d3bbfb41d97c95e6f0f78ee3e06120d1e0b2830488dca9359c954d37d \
  https://git.spacemit.com/api/v4/projects/33/packages/pypi/files/f89e843d3bbfb41d97c95e6f0f78ee3e06120d1e0b2830488dca9359c954d37d/jiter-0.9.0-cp312-cp312-linux_riscv64.whl

download \
  pydantic_core-2.33.0-cp312-cp312-linux_riscv64.whl \
  a86e3495e492f6856e77aa01dd162c1a0402a7fea43279df5d66581424e9f12d \
  https://git.spacemit.com/api/v4/projects/33/packages/pypi/files/a86e3495e492f6856e77aa01dd162c1a0402a7fea43279df5d66581424e9f12d/pydantic_core-2.33.0-cp312-cp312-linux_riscv64.whl

echo "Prepared verified core-agent assets in $cache_dir"
