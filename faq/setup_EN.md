# Installation and Startup FAQ

## Image pull fails (Download failed) or is slow?

This is typically due to unstable network connections to Docker Hub in China.
1. Configure mirror source: Set up domestic accelerated mirrors (such as Alibaba Cloud, NetEase, Nanjing University) in `/etc/docker/daemon.json`.
   - Example: `ghcr.nju.edu.cn` can be used as a replacement for `ghcr.io`.
2. Modify configuration: Edit `docker-compose.yaml`, replace `ghcr.io/` in image addresses with domestic mirror source addresses (e.g., `ghcr.nju.edu.cn/`).
3. Network proxy: Ensure the server can access external networks, or configure a Docker proxy.

## Port occupied error on startup?

1. Check ports: Default ports used are 8000 (Casdoor), 80 (Nginx), 18998 (MINIO), etc.
2. Modify configuration: Change the port mapping for conflicting services in the `.env` file.
3. Docker conflict: Ensure no old containers are running. Try `docker compose down` to clean up before starting.

## 404 or 502 Bad Gateway after deployment?

1. Check logs: Run `docker compose logs -f` to view errors from `astron-agent-console-hub` or nginx.
2. Wait for startup: Services take time to start, especially when pulling images and initializing the database for the first time, please be patient.
3. Check configuration: Confirm that `HOST_BASE_ADDRESS` in `.env` is configured correctly (for remote deployment, it should be a public IP/domain, not localhost).

## Is Docker required?

Yes, the Astron Agent platform depends on Docker for containerized deployment.

## How to update to the latest version?

1. Pull code: `git pull origin main`
2. Update images: `docker compose pull`
3. Restart services:
   ```
   docker compose down
   docker compose up -d
   ```
   Note: If database field changes are involved, you may need to execute database migrations. If your test environment allows, you can use `docker compose down -v` to clear data and reinitialize (use with caution, this will delete all data).

## "request returned 500 Internal Server Error" on startup?

This is usually caused by inconsistent environment states. Please try the following steps:
1. Back up important data.
2. Execute `docker compose -f docker-compose-with-auth.yaml down -v` to clean up containers and data volumes (note: this step will delete data).
3. Run `git restore docker` to restore file modifications in the docker directory.
4. Check that the environment variable `ASTRON_AGENT_VERSION` is set to a stable version (such as `v1.0.0-rc.x`).
5. Re-run `docker compose -f docker-compose-with-auth.yaml up -d` to start services.
6. Clear browser cache or use incognito mode to access.
