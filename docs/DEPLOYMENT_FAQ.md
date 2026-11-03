# Deployment FAQ

> The current Python Console migration delivers accounts only. Follow the [operating instructions](../console/backend/README.md) to preserve data and import existing users. UIDs remain unchanged; an operator issues password-reset links.

This document collects common deployment questions and practical troubleshooting paths for Astron Agent.

---

## 1. How Do I Upgrade An Existing Deployment

If you already have Astron Agent running and want to upgrade to the latest version, follow these steps:

### Upgrade Steps

```bash
# Enter the astronAgent directory
cd docker/astronAgent

# Stop the services
docker compose -f docker-compose.yaml down

# Fetch the latest code
git fetch
git pull

# Pull the latest images
docker compose -f docker-compose.yaml pull

# Reconfigure and start again based on the deployment docs
# Refer to DEPLOYMENT_GUIDE_WITH_AUTH for the latest setup steps
```

### Notes

- Back up important data before upgrading
- Review whether configuration files need updates after the upgrade
- Start the services only after confirming all environment variables are correct

---

## 2. What If The Web Page Does Not Open After Deployment

Check the application entry point, Console health and logs. Ensure both frontend and backend images are built from the migration branch, and verify database, Redis, host and cookie settings. This stage provides account pages only; failures in unmigrated business features do not mean user data was lost.

Preserve databases and volumes rather than reinstalling with a data wipe. See the [Python Console operating instructions](../console/backend/README.md) for importing existing users and issuing password-reset links.

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

- [Account Migration Guide](/DEPLOYMENT_GUIDE_WITH_AUTH)
- [Deployment Guide](/DEPLOYMENT_GUIDE)
