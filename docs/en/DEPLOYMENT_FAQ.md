# Deployment FAQ

This document collects common deployment questions and practical troubleshooting paths for Astron Agent.

---

## 1. How Do I Upgrade An Existing Deployment

If you already have Astron Agent running and want to upgrade to the latest version, follow these steps:

### Upgrade Steps

```bash
# Enter the astronAgent directory
cd docker/astronAgent

# Stop all services, including Casdoor
docker compose -f docker-compose-with-auth.yaml down

# Fetch the latest code
git fetch
git pull

# Pull the latest images
docker compose -f docker-compose-with-auth.yaml pull

# Reconfigure and start again based on the deployment docs
# Refer to DEPLOYMENT_GUIDE_WITH_AUTH for the latest setup steps
```

### Notes

- Back up important data before upgrading
- If you use the deployment without authentication, replace `docker-compose-with-auth.yaml` with `docker-compose.yaml`
- Review whether configuration files need updates after the upgrade
- Start the services only after confirming all environment variables are correct

---

## 2. What If The Web Page Does Not Open After Deployment

Use the following checklist step by step. Back up important data before performing destructive operations.

1. Run `docker compose -f docker-compose-with-auth.yaml down -v` to clear containers and volumes. This removes all persisted data.
2. Run `git restore docker` to discard local changes under the `docker` directory and return to the repository version.
3. Set the `ASTRON_AGENT_VERSION` environment variable to a stable release such as `v1.0.0-rc.x`.
4. Reconfigure the remaining environment variables according to the deployment guide and verify the values carefully.
5. Run `docker compose -f docker-compose-with-auth.yaml up -d` to start all services again.
6. Clear the browser cache or open the page in an incognito window.

---

## 3. What If Official Docker Images Fail To Pull Because Of Network Issues

1. For Astron Agent images, edit `docker/astronAgent/docker-compose.yaml` and replace the `ghcr.io/` prefix in the relevant `image` fields with `ghcr.nju.edu.cn/`.
2. For middleware and other third-party images, switch Docker to a domestic mirror such as `https://docker.nju.edu.cn`, `https://docker.xuanyuan.me`, or `https://docker.mirrors.ustc.edu.cn`.

---

## 4. What If `git clone` Fails Because Of Network Issues

1. Use a GitHub mirror to clone the repository, for example: `git clone https://gitclone.com/github.com/iflytek/astron-agent.git`
2. If you need more mirrors, check continuously updated mirror lists such as `https://freevaults.com/github-mirror-daily-updates.html`.

---

## Related Documentation

- [Deployment Guide With Auth](/en/DEPLOYMENT_GUIDE_WITH_AUTH)
- [Deployment Guide Without Auth](/en/DEPLOYMENT_GUIDE)
