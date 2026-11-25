#!/bin/sh
set -eu

if [ "${CONSOLE_RUN_MIGRATIONS:-true}" = "true" ]; then
    python manage.py migrate --noinput
    if [ -n "${CONSOLE_USERNAME_MAP:-}" ]; then
        python manage.py import_legacy_users --username-map "$CONSOLE_USERNAME_MAP"
    else
        python manage.py import_legacy_users
    fi
    python manage.py adopt_legacy_publications --allow-unresolved
    if [ -n "${OSS_ENDPOINT:-}" ]; then
        python manage.py init_resource_storage
    fi
fi

exec python manage.py serve_console
