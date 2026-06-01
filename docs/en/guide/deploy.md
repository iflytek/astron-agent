# Deployment Overview

Astron Agent is easiest to adopt in two phases: get a working environment up first, then move toward production-grade deployment and operations. This page helps you choose the right path and jump into the detailed references.

## Deployment Paths

### Docker Compose

Best for local evaluation, functional validation, and small-team integration work.

- Benefits: fast startup, low setup cost, ideal for local and test environments
- Typical use cases: demos, developer collaboration, first architecture validation
- Suggested entry: [Quick Start](/en/guide/quick-start)

### Helm / Kubernetes

Best for standardized production deployment, scaling, and long-term operations.

- Benefits: better for multi-instance rollout, elasticity, and unified operations
- Typical use cases: enterprise clusters, CI/CD, environment isolation
- Related directory: `helm/`

## What To Decide Before Deployment

- Prepare database, cache, and object storage dependencies
- Confirm model access strategy and secret management
- Decide whether authentication is required
- Evaluate whether you need RPA, plugin, and tenant capabilities

## Recommended References

- [Auth Deployment Guide](/en/DEPLOYMENT_GUIDE_WITH_AUTH)
- [Auth + RPA Deployment Guide](/en/DEPLOYMENT_GUIDE_WITH_AUTH_RPA)
- [Full Deployment Guide](/en/DEPLOYMENT_GUIDE)
- [Deployment FAQ](/en/DEPLOYMENT_FAQ)
- [Configuration Reference](/en/CONFIGURATION)

## Typical Guidance

- Need the fastest path: start with Docker Compose
- Need unified identity: review the authentication-related deployment docs first
- Planning production rollout: combine deployment, configuration, and FAQ together
