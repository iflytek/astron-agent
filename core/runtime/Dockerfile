FROM python:3.11-slim

WORKDIR /opt/runtime

ENV PYTHONPATH=/opt/runtime
ENV UV_NO_CACHE=1

RUN pip install uv --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple/

COPY core/runtime/pyproject.toml ./
COPY core/runtime/uv.lock ./
RUN uv sync --frozen --no-dev -i https://pypi.tuna.tsinghua.edu.cn/simple/

ARG GIT_COMMIT=dev
ENV RUNTIME_CODE_VERSION=${GIT_COMMIT}

COPY core/runtime/alembic.ini ./
COPY core/runtime/alembic ./alembic
COPY core/runtime/agent_runtime ./agent_runtime

CMD ["uv", "run", "--no-sync", "uvicorn", "agent_runtime.main:app", "--host", "0.0.0.0", "--port", "8790"]
