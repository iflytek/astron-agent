# RISC-V (`linux/riscv64`) support

## Current scope

RISC-V support is incremental. `core-tenant` and `core-agent` now have verified `linux/riscv64` build and runtime paths. The full Docker Compose stack is **not yet supported** on RISC-V.

| Component | `linux/riscv64` status | Notes |
| --- | --- | --- |
| `core-tenant` | Verified | Static Go binary in a `scratch` image; CI and release manifests include `linux/riscv64`. |
| `core-database` | Not yet verified | Python dependencies and the target runtime image need an architecture audit. |
| `core-rpa` | Not yet verified | Optional component; Python and external RPA dependencies need an architecture audit. |
| `core-link` | Not yet verified | Python dependencies need an architecture audit. |
| `core-aitools` | Not yet verified | Python, object-storage, and database dependencies need an architecture audit. |
| `core-agent` | Verified, native build | `Dockerfile.riscv64` builds on a real RISC-V host; 239 tests and both health endpoints pass. It is not yet added to the public image workflow. |
| `core-knowledge` | Not yet verified | Python/RAG dependencies need an architecture audit. |
| `core-workflow` | Not yet verified | Python native dependencies, including the architecture markers in `pyproject.toml`, need remediation. |
| Console frontend and hub | Not yet verified | Node/Nginx and Java runtime images need an architecture audit. |
| Optional RAGFlow/RPA stack | Unsupported | Keep disabled until its images, native libraries, and hard-coded x86 paths are replaced or verified. |

Do not deploy `docker/astronAgent/docker-compose.yaml` unchanged on RISC-V. It still references components that do not publish or have not verified `linux/riscv64` artifacts.

## Build design for `core-tenant`

The builder runs on the Buildx build platform and cross-compiles a static target binary using `TARGETOS` and `TARGETARCH`. The runtime stage uses `scratch`, so a target-architecture Debian image is not required.

Build a single RISC-V image on an AMD64 or ARM64 Buildx host:

```bash
docker buildx build \
  --platform linux/riscv64 \
  --file core/tenant/Dockerfile \
  --tag astron-agent/core-tenant:riscv64 \
  --load \
  .
```

Publishing workflows build `core-tenant` for `linux/amd64`, `linux/arm64`, and `linux/riscv64`. Other services retain their current AMD64/ARM64 platform list.

## Build `core-agent` on native RISC-V

The Python service currently requires a native RISC-V build. Prepare the compatible Bianbu base image and hash-verified assets first:

```bash
./docker/riscv64/import-bianbu-base.sh
./docker/riscv64/prepare-core-agent-assets.sh
docker build --file core/agent/Dockerfile.riscv64 --tag astron-agent/core-agent:riscv64 .
```

The Git-ignored `docker/riscv64/.cache/` holds verified assets. Do not substitute `harbor.spacemit.com/bianbu/bianbu:latest` on SpacemiT X60: the inspected image required unavailable RISC-V vector extensions. The importer uses the compatible, SHA-256-pinned official Bianbu rootfs.

## Native verification

The initial native validation used the following environment:

- Astron Agent base commit: `327eee28a8407d5450a1e5c5aa44705f6adbda85`
- OS: Bianbu 2.3, Linux 6.6.63
- CPU: 8-core SpacemiT X60
- Architecture: `riscv64`
- Go: 1.23.1 (`linux/riscv64`)
- Python: 3.12.3 (`riscv64`)
- Docker: 26.1.3 (`linux/riscv64`)
- MySQL: 8.0.40 (`riscv64`)
- uv: 0.12.5 (`riscv64gc-unknown-linux-gnu`)
- librdkafka: 2.11.1, built from verified source

Reproduce the native compile checks from `core/tenant`:

```bash
go test ./...
CGO_ENABLED=0 GOOS=linux GOARCH=riscv64 \
  go build -trimpath -o core-tenant-linux-riscv64 .
file core-tenant-linux-riscv64
```

The verified runtime sequence started the `scratch` image against a temporary MySQL database, received `{"message":"pong"}` from `GET /ping`, applied migration `20260326_0001`, created `schema_migrations`, `tb_app`, and `tb_auth`, and shut down cleanly on `SIGTERM` with exit code 0.

The verified `core-agent` image reported `linux/riscv64`, imported all five native dependencies at their locked versions, passed all 239 tests, returned `UP` from both `GET /health/live` and `GET /health/ready`, and stopped with exit code 0.

## CI guardrail

The Go test job cross-compiles `core-tenant` with `CGO_ENABLED=0 GOOS=linux GOARCH=riscv64`. `core-agent` remains a native RISC-V build until an appropriate native runner or controlled wheelhouse artifacts are available. A true RISC-V smoke test remains required before expanding support to another component or claiming full-stack compatibility.
