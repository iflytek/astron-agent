# Configuration Overview

This page summarizes the most important configuration domains so you can quickly decide which detailed reference to read next.

## Key Configuration Areas

### Infrastructure

- Databases and caches
- Object storage
- Networking and reverse proxy
- Container runtime environment

### Models And AI Capabilities

- Model gateway or MaaS connection settings
- API keys and authentication details
- Capability switches and routing strategies

### Platform Capabilities

- MCP and external tool integration
- RPA execution environment
- Multi-tenant, space, and team capabilities

### Authentication And Security

- Internal username/password accounts and session configuration
- Environment variable management
- Secret injection and permission boundaries in production

## Recommended References

- [Configuration Reference](/CONFIGURATION)
- [Account Setup and Migration](/DEPLOYMENT_GUIDE_WITH_AUTH)
- [Project Modules](/PROJECT_MODULES)

## Suggested Order

1. Start the default Compose stack without copying or editing `.env`; localhost and server IP access work with the defaults
2. Add production dependencies and secret management
3. Extend MCP, RPA, and optional modules for your business scenario
