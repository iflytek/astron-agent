#!/bin/sh
set -e

echo "===== Initializing Casdoor Configuration ====="
echo "CONSOLE_DOMAIN: ${CONSOLE_DOMAIN:-http://localhost}"
echo "HOST_BASE_ADDRESS: ${HOST_BASE_ADDRESS:-http://localhost}"

# Copy config files from ConfigMap (read-only) to writable directory
echo "Copying config files..."
cp -v /conf-ro/* /conf/ 2>/dev/null || true

# Generate init_data.json from template
echo "Generating init_data.json from template..."
sed -e "s|\${CONSOLE_DOMAIN}|${CONSOLE_DOMAIN}|g" \
    -e "s|\${HOST_BASE_ADDRESS}|${HOST_BASE_ADDRESS}|g" \
    /conf-ro/init_data.json.template > /conf/init_data.json

echo "Configuration ready!"
echo "redirectUris: [${CONSOLE_DOMAIN}/callback, ${HOST_BASE_ADDRESS}/callback]"
echo "=========================================="

# Start Casdoor
exec /server --createDatabase=true