# Console deployment and account migration

The Console now uses Python with internal username/password registration and sign-in. Follow the [deployment guide](DEPLOYMENT_GUIDE.md) and [Python Console operating instructions](../console/backend/README.md). The separate authentication service and old combined launchers have been removed.

New users register at `/register`; there is no default administrator password. Existing users retain their original UID and resource ownership. An operator verifies ownership and issues a one-time password-reset link.

In `docker/astronAgent`, run `docker compose up -d --build` without creating or editing `.env`. Open `http://localhost/` or `http://<server-ip>/` on port 80. Signing credentials persist automatically. Password-reset commands print a relative `/reset-password#...` link by default; append it to the console address, or supply `--origin` for a complete URL.
