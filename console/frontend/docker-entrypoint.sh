#!/bin/sh
set -eu
# The Console API is always served from the same origin.
exec nginx -g "daemon off;"
