FROM python:3.11-slim

WORKDIR /opt/core

ENV PATH=$PATH:/opt/core
ENV PYTHONPATH /opt/core
ENV UV_NO_CACHE=1

RUN pip install uv --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple/

COPY core/plugin/aitools/pyproject.toml ./
COPY core/plugin/aitools/uv.lock ./

RUN uv sync -i https://pypi.tuna.tsinghua.edu.cn/simple/

COPY core/common ./common
COPY core/plugin/aitools ./plugin/aitools

CMD ["uv", "run", "plugin/aitools/main.py"]