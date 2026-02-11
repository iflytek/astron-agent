# Use the base image with Python 3.11 and Spark Link dependencies
FROM python:3.11-slim

# Set the working directory for the application
WORKDIR /opt/core

# Configure environment variables for Python path and UV cache
ENV PATH=$PATH:/opt/core
ENV PYTHONPATH /opt/core
ENV UV_NO_CACHE=1

# Install curl and dependencies (commented out - not currently needed)
#RUN apt-get update && apt-get install -y --no-install-recommends \
#    curl ca-certificates unzip \
#    && rm -rf /var/lib/apt/lists/*

# Install Deno runtime (commented out - not currently needed)
#RUN curl -fsSL https://deno.land/install.sh | sh -s v2.3.3

# Install UV package manager using Tsinghua mirror for faster downloads
RUN pip install uv --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/

# Copy dependency files for UV to resolve and install packages
COPY core/workflow/uv.lock core/workflow/pyproject.toml ./

# Install Python dependencies using UV with Tsinghua mirror
RUN uv sync -i https://mirrors.aliyun.com/pypi/simple/

# Copy the entire workflow source code to the container
COPY core/workflow ./workflow
COPY core/common ./common

# Set the default command to run the main application using UV
CMD ["uv", "run", "workflow/main.py"]
