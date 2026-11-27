# Local Docker sandbox

From the repository root, start the application with the optional sandbox overlay.

~~~sh
docker compose -f docker/astronAgent/docker-compose.yaml \
  -f docker/astronAgent/docker-compose.local-sandbox.yaml up -d --build
~~~

Select **本地 Docker** in the Console sandbox settings and run its connection test. The test runs inside the container, writes and reads a temporary workspace file, and removes it afterward.

The execution container stays running and stores workspaces in the Docker volume named by Compose as local_sandbox_workspace. Agent chats and workflow Agent nodes use the referenced Agent directory. Workflow code runs use the workflow directory. Recreating the container preserves this volume. Removing the volume deletes the workspace files.

The runtime runs under a shared user. Enable the local provider for trusted code and resources within the same trust boundary. The runner exposes an authenticated API on the application network and requires access to the Docker Engine socket. Set LOCAL_SANDBOX_DOCKER_SOCKET to use a different socket on the deployment host.

The runner executes one request at a time and serves up to 16 waiting requests in arrival order. The queue allows up to 60 seconds of waiting before returning a busy response. The command execution timeout starts after the request leaves the queue.

Run the workspace, subprocess, and overlapping request checks from the repository root.

~~~sh
uv run --no-project --with 'docker==7.1.0' --with 'fastapi==0.115.12' --with httpx \
  python -m unittest discover -s docker/astronAgent/local-sandbox -v
~~~
