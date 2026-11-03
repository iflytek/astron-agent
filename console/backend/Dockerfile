FROM ghcr.io/astral-sh/uv:0.12.2 AS uv
FROM python:3.11-slim AS build
COPY --from=uv /uv /usr/local/bin/uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc pkg-config default-libmysqlclient-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY console/backend/pyproject.toml console/backend/uv.lock ./
RUN uv sync --frozen --no-dev --extra mysql --no-install-project

FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmariadb3 curl && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home console
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
COPY console/backend/astron_console /app/astron_console
COPY console/backend/manage.py console/backend/entrypoint.sh /app/
ENV PATH="/app/.venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER console
EXPOSE 8080
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
