# Quick Start

This page keeps the shortest path for first-time evaluation. Start with a local environment, then move to the full deployment and configuration references when needed.

## Who Should Start Here

- Developers who want to try the full flow locally first
- Teams that need a sign-in capable demo environment quickly
- Users who plan to move from Docker Compose to Helm or production settings later

## Two Steps To Get Running

### 1. Clone The Repository And Prepare Environment Variables

```bash
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent/docker/astronAgent
cp .env.example .env
```

After copying the file, fill in model, database, object storage, and authentication settings as required.

### 2. Start The Services

```bash
docker compose -f docker-compose-with-auth.yaml up -d
```

Once the stack is ready, the default entry points are:

- Astron Agent frontend: `http://localhost/`
- Casdoor admin console: `http://localhost:8000`

## Recommended Reading Order

1. Read the [Deployment Overview](/en/guide/deploy)
2. Continue with [Configuration Overview](/en/guide/config)
3. Check the [FAQ](/en/faq) when you need troubleshooting paths

## Deeper References

- [Project README](/en/README)
- [Auth Deployment Guide](/en/DEPLOYMENT_GUIDE_WITH_AUTH)
- [Full Deployment Guide](/en/DEPLOYMENT_GUIDE)
