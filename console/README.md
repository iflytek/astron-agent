# Astron Console

The console combines a React/TypeScript frontend with a Python Django ASGI backend. Django owns accounts, spaces, resources, Agent definitions, workflow management, publishing, and persisted execution records. Independent Agents and workflow Agent nodes execute through the same `core/agent` engine; `core/workflow` owns graph scheduling.

## Structure

- `frontend/src`: pages, components, API clients, state, and workflow editor.
- `backend/astron_console`: accounts, spaces, resources, knowledge, agents, workflows, and publishing domains.
- `backend/manage.py`, `pyproject.toml`, `uv.lock`: Django commands and locked Python dependencies.
- `backend/Dockerfile`: Python service image, deployed under the existing `console-hub` service name.

MySQL stores identities, sessions, business records, immutable versions, and execution history. Redis supports caches and coordination; MinIO retains uploaded files and workflow artifacts. Browser authentication uses same-origin session cookies and CSRF. Application API credentials and service credentials have separate authorization boundaries.

## Development

Follow [backend setup](backend/README.md) for database, Redis, persistent secrets, and existing-account activation. Start the backend after configuring those dependencies:

```sh
cd console/backend
uv sync --locked --extra mysql
uv run python manage.py migrate --noinput
uv run python manage.py import_legacy_users
uv run python manage.py runserver 127.0.0.1:8080
```

In a second terminal:

```sh
cd console/frontend
npm ci --legacy-peer-deps
npm run dev
```

The frontend proxies `/console-api/` to the configured backend. Use `CONSOLE_DEV_BACKEND` to override the default local address.

## Verification and deployment

Run `make ci LOCALCI_CONFIG=makefiles/localci.toml` from the repository root for all configured modules. Console uses Ruff, Django migration checks, and Django tests; the frontend uses TypeScript, ESLint, unit tests, and Vite builds.

Compose is maintained in `docker/astronAgent/docker-compose.yaml`; Kubernetes configuration is in `helm/astron-agent`. Preserve existing databases, object keys, UIDs, configuration, and credential volumes when upgrading. Django migrations adopt existing business tables without running retired initialization scripts. RPA execution connects to an independently deployed RPA platform using its configured API key; Console does not manage that platform's accounts or deployment.
