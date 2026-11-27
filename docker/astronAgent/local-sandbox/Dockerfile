FROM python:3.11-slim-bookworm@sha256:ef56ae98435cc40d8a27020b0b32a9941515acd5840f0fba34858bb34dd362d1 AS runtime

ENV PYTHONUNBUFFERED=1
RUN mkdir /workspace /workspace/agents /workspace/workflows /skills /run/sandbox-jobs \
    && chown -R 10001:10001 /workspace \
    && chmod 0750 /workspace /workspace/agents /workspace/workflows
COPY execution.py /opt/astron-sandbox/execution.py
USER 10001:10001
CMD ["sleep", "infinity"]

FROM python:3.11-slim-bookworm@sha256:ef56ae98435cc40d8a27020b0b32a9941515acd5840f0fba34858bb34dd362d1 AS runner

ENV PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir docker==7.1.0 fastapi==0.115.12 uvicorn==0.34.0
COPY runner.py /opt/astron-sandbox/runner.py
WORKDIR /opt/astron-sandbox
CMD ["uvicorn", "runner:app", "--host", "0.0.0.0", "--port", "8090", "--no-access-log"]
