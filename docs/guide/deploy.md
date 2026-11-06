# Deployment Overview

Astron Agent is easiest to adopt in two phases: get a working environment up first, then move toward production-grade deployment and operations. This page helps you choose the right path and jump into the detailed references.

## Deployment Paths

### Docker Compose

Best for local evaluation, functional validation, and small-team integration work.

- Benefits: fast startup, low setup cost, ideal for local and test environments
- Typical use cases: demos, developer collaboration, first architecture validation
- Suggested entry: [Quick Start](/guide/quick-start)

### Helm / Kubernetes

Best for standardized production deployment, scaling, and long-term operations.

- Benefits: better for multi-instance rollout, elasticity, and unified operations
- Typical use cases: enterprise clusters, CI/CD, environment isolation
- Related directory: `helm/`

## Optional Customization After Default Startup

- The default Compose stack includes database, cache, and storage; external replacements are optional
- Confirm model access strategy and secret management
- Default Compose needs no `.env` edits, including access by server IP; signing credentials persist automatically and cookie security follows HTTP/HTTPS
- Custom domains and additional HTTPS proxies can be configured explicitly when needed
- Evaluate whether you need RPA, plugin, and tenant capabilities

## Recommended References

- [Account Setup and Migration](/DEPLOYMENT_GUIDE_WITH_AUTH)
- [External RPA Integration](/DEPLOYMENT_GUIDE_WITH_AUTH_RPA)
- [Full Deployment Guide](/DEPLOYMENT_GUIDE)
- [Deployment FAQ](/DEPLOYMENT_FAQ)
- [Configuration Reference](/CONFIGURATION)

## Typical Guidance

- Need the fastest path: start with Docker Compose
- Upgrading existing users: follow the account import and password-reset instructions
- Planning production rollout: combine deployment, configuration, and FAQ together
