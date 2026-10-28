# Casdoor password storage and optional maintenance

Regular Docker Compose deployment no longer uses `astron-agent-casdoor-passwords:local`.
Users do not build this helper image, and CI does not build or publish it. The
existing `casdoor-gateway` reverse proxy depends directly on Casdoor startup.
Deployment neither checks nor migrates stored passwords, and historical password
formats no longer block the public authentication gateway.

Casdoor's native login behavior and the organization template's password policy
remain unchanged. Casdoor 2.67 creates its built-in organization before reading
initialization templates, so template policy alone does not establish that all
existing organizations and accounts use hashed storage. Removing the startup
check does not migrate historical data. Administrators can explicitly use the
retained Python maintenance script when needed.

## Regular deployment

Configure `.env` in `docker/astronAgent`, then follow the deployment guide:

```bash
docker compose -f docker-compose-with-auth.yaml pull
docker compose -f docker-compose-with-auth.yaml up -d
```

Use `docker-compose-auth.yml` for standalone authentication or
`docker-compose-with-auth-rpa.yaml` for the RPA bundle. No extra password-check
service or local image build is required.

## Optional historical password maintenance

`casdoor/password-storage/passwords.py` is an explicit administrator tool, not a
startup dependency. Prepare Python 3.12 and its dependencies in a trusted
maintenance environment with access to Casdoor MySQL:

```bash
# Run from docker/astronAgent; no Docker image is created.
python3 -m venv .venv-casdoor
.venv-casdoor/bin/python -m pip install -r casdoor/password-storage/requirements.txt
```

Set `CASDOOR_MIGRATION_DB_PASSWORD` through your deployment's credential-management
mechanism. Set `CASDOOR_MIGRATION_DB_HOST`, `CASDOOR_MIGRATION_DB_PORT`,
`CASDOOR_MIGRATION_DB_USER`, and `CASDOOR_MIGRATION_DB_NAME` as needed. The default
host `casdoor-mysql` resolves only inside the corresponding Compose network; use
an address reachable from the maintenance environment. Regular deployment does
not require publishing a new database port.

```bash
# Read-only storage verification.
.venv-casdoor/bin/python casdoor/password-storage/passwords.py --check
# Default mode previews counts without printing passwords or hashes.
.venv-casdoor/bin/python casdoor/password-storage/passwords.py
```

Before applying a migration, back up the Casdoor database and verify restore,
arrange a maintenance window, stop public authentication traffic, and stop all
Casdoor instances sharing the database. Keep MySQL running:

```bash
docker compose -f docker-compose-with-auth.yaml stop casdoor-gateway casdoor
.venv-casdoor/bin/python casdoor/password-storage/passwords.py --apply
.venv-casdoor/bin/python casdoor/password-storage/passwords.py --check
docker compose -f docker-compose-with-auth.yaml up -d casdoor casdoor-gateway
```

A second preview should report zero account and policy updates. Verify successful
and failed logins with a test account and retain an administrator recovery path
before reopening traffic. Routine deployment never applies this migration.
Hashes cannot be converted back into plaintext.

The tool targets Casdoor v2.67.0's unprefixed MySQL schema. It transactionally
converts plaintext to Argon2id, preserves account IDs and login passwords, and
preserves valid existing bcrypt/Argon2id hashes. Invalid hashes, ambiguous metadata,
LDAP accounts with local passwords, and organization master/default passwords
require administrator review. Keep `initDataNewOnly = true` to avoid recreating
organizations and accounts on restart.

Unit and real Casdoor/MySQL integration tests continue to verify optional
migration, login, rollback, idempotence, and restart. CI uses official service
images and Python on its test runner; no custom password-helper image is built.
