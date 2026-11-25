# Tenant service

Tenant provides the internal application and API key APIs used by Console, Agent and Workflow. It uses FastAPI, Uvicorn, SQLAlchemy and MySQL. The default port is 5052 and `GET /ping` does not require credentials. Business routes under `/v2/app` require the deployment secret in `X-Tenant-Internal-Key`.

From this directory, run `uv sync --locked` and `uv run --locked python -m tenant`. Settings are read from `config/config.toml` in the image and `config.toml` for local development. Use `--config` to select a TOML file. Set `DATABASE_USERNAME`, `DATABASE_PASSWORD` and `DATABASE_URL` for an accessible MySQL server. The URL uses `(host:port)/database` and accepts the existing `tls`, `charset`, `collation`, `timeout`, `readTimeout`, `writeTimeout`, `time_zone` and `sql_mode` options. Tenant accepts `parseTime` and `loc` for compatibility and decodes MySQL DATETIME as wall-clock values. Other Go-driver-specific flags are rejected during startup. The MySQL user must be able to create the database and its tables on first launch.

Set `TENANT_KEY` and `TENANT_SECRET`, or provide their paths through `TENANT_KEY_FILE` and `TENANT_SECRET_FILE`. Each value must be distinct and contain 32–50 ASCII letters, digits, or characters from `._~-`. The bootstrap app ID is `680ab54f`. Existing application records and active keys are usable across upgrades. Tenant reconciles the deployment-managed pair at startup and retires previous managed credentials on rotation.

Run tests with `uv run --locked pytest`. To enable MySQL integration tests, set `TENANT_TEST_MYSQL_PORT` and, if required, `TENANT_TEST_MYSQL_PASSWORD` for root on a disposable server at `127.0.0.1`. The tests create and delete uniquely named databases.
