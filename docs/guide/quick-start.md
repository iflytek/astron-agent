# Quick Start

> The default Compose stack starts without copying or editing `.env`. New users register at `/register`; existing users retain their UID and receive an operator-issued password-reset link. Preserve business data and persistent credentials during upgrades.

This page keeps the shortest path for first-time evaluation. Start with a local environment, then move to the full deployment and configuration references when needed.

## Who Should Start Here

- Developers who want to verify internal accounts locally first
- Teams that need a sign-in capable demo environment quickly
- Users who plan to move from Docker Compose to Helm or production settings later

## Two Steps To Get Running

### 1. Clone The Repository

```bash
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent/docker/astronAgent
```

The bundled database, cache, storage, and account settings work out of the box. Configure model providers and optional external capabilities in the console after startup.

### 2. Start The Services

```bash
docker compose up -d --build
```

Once the stack is ready, the default entry points are:

- Astron Agent frontend: `http://localhost/` locally, or `http://<server-ip>/` remotely, on port 80. No environment changes are needed for server IP access.

## Recommended Reading Order

1. Read the [Deployment Overview](/guide/deploy)
2. Continue with [Configuration Overview](/guide/config)
3. Check the [FAQ](/faq) when you need troubleshooting paths

## Deeper References

- [Project README](/README)
- [Account Setup and Migration](/DEPLOYMENT_GUIDE_WITH_AUTH)
- [Full Deployment Guide](/DEPLOYMENT_GUIDE)
