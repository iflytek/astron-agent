FROM python:3.11-slim

WORKDIR /opt/core

ENV PATH=$PATH:/opt/core
ENV PYTHONPATH /opt/core
ENV UV_NO_CACHE=1

# Keep the build independent of public mirrors; allow an internal index override.
ARG PYPI_INDEX_URL=https://pypi.org/simple/
RUN pip install uv --no-cache-dir --index-url "${PYPI_INDEX_URL}"

COPY core/memory/database/pyproject.toml ./
COPY core/memory/database/uv.lock ./

RUN uv sync --default-index "${PYPI_INDEX_URL}"

COPY core/common ./common
RUN mkdir ./memory
COPY core/memory/database ./memory/database

CMD ["uv", "run", "memory/database/main.py"]
