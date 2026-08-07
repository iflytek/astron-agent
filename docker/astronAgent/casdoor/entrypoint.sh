#!/bin/sh
set -e

echo "===== Initializing Casdoor Configuration ====="
echo "CONSOLE_DOMAIN: ${CONSOLE_DOMAIN:-http://localhost}"
echo "HOST_BASE_ADDRESS: ${HOST_BASE_ADDRESS:-http://localhost}"

# Create runtime config directory (inside container, not on host)
mkdir -p /conf

# Copy static config files to runtime directory
cp /conf-templates/app.conf /conf/app.conf

# Generate init_data.json from template using sed (replace all environment variables)
echo "Generating init_data.json from template..."
sed -e "s|\${CONSOLE_DOMAIN}|${CONSOLE_DOMAIN}|g" \
    -e "s|\${HOST_BASE_ADDRESS}|${HOST_BASE_ADDRESS}|g" \
    /conf-templates/init_data.json.template > /conf/init_data.json

echo "Configuration updated successfully!"
echo "redirectUris: [${CONSOLE_DOMAIN}/callback, ${HOST_BASE_ADDRESS}/callback]"
echo "=========================================="

# Start Casdoor
exec /server --createDatabase=true