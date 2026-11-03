# Console deployment and account migration

The Console now uses Python with internal username/password registration and sign-in. Follow the [deployment guide](DEPLOYMENT_GUIDE.md) and [Python Console operating instructions](../console/backend/README.md). The separate authentication service and old combined launchers have been removed.

New users register at `/register`; there is no default administrator password. Existing users retain their original UID and resource ownership. An operator verifies ownership and issues a one-time password-reset link.

The external RPA application still has its own identity dependency. The new Console login does not replace it. Combined Agent/RPA startup and sign-in are temporarily unavailable and will return during the publishing/channel migration.
