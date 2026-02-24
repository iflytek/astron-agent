# Configuration and Authentication FAQ

## Login loop after login, or redirect to localhost?

1. Casdoor configuration: Casdoor's `origin` and `redirect_uri` must match the browser's access address.
2. Casdoor backend: Log in to the Casdoor management backend (default port 8000) and check the Application's callback address configuration.

## What are the default username and password?

- Casdoor (management backend): Username `admin`, password `123`.
- Ragflow: You need to register an account yourself.

## Does Casdoor support HTTPS?

Currently, the built-in Casdoor configuration in Astron may not support enabling HTTPS directly. It is recommended to add an Nginx reverse proxy layer before the Casdoor service to handle SSL/HTTPS encryption.

## Application creation fails with 403 error in logs?

403 is usually a permission or authentication issue. Please check that environment variable configurations (such as API Key, Secret, etc.) are correctly filled in and match the deployment documentation requirements.

## Changes to IP address or port configuration not taking effect?

After modifying environment variables in the `.env` file or `docker-compose.yaml`, you must restart containers for changes to take effect:
`docker compose down` followed by `docker compose up -d`.

## Can clients switch organizations?

Yes. Client login is based on Casdoor authentication. Please refer to the deployment guide with authentication to configure organizations and users in the Casdoor management page.
