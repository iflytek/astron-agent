FROM python:3.11-slim

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH" \
    UV_NO_CACHE=1

RUN pip install --no-cache-dir uv==0.12.0 \
    && useradd --create-home --uid 10001 ppt

COPY pyproject.toml uv.lock ./
COPY src ./src

RUN uv sync --frozen --no-dev \
    && chown -R ppt:ppt /app

USER ppt

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=60 \
    CMD ["python", "-c", "import socket; socket.create_connection(('127.0.0.1', 3000), 3).close()"]

CMD ["zwppt-mcp"]
