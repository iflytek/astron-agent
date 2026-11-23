FROM python:3.11-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.12.2 /uv /usr/local/bin/uv
WORKDIR /opt/tenant
COPY core/tenant/pyproject.toml core/tenant/uv.lock ./
RUN uv sync --locked --no-dev

FROM python:3.11-slim
WORKDIR /opt/tenant
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY --from=builder /opt/tenant/.venv .venv
COPY core/tenant/tenant tenant
COPY core/tenant/config.toml config.toml
CMD ["/opt/tenant/.venv/bin/python", "-m", "tenant"]
