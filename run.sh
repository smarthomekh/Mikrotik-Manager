#!/usr/bin/env sh
set -e

echo "[MikroTik Manager] Starting MikroTik Gateway Manager v1.4.1 (Home Assistant & CasaOS)..."

CONFIG_PATH=/data/options.json

if [ -f "$CONFIG_PATH" ]; then
    echo "[MikroTik Manager] Home Assistant options.json detected at $CONFIG_PATH."
else
    echo "[MikroTik Manager] Running in standalone / CasaOS mode."
fi

export PORT="${PORT:-3000}"
export NODE_ENV=production

cd /app

if [ -f "dist/server.js" ]; then
    echo "[MikroTik Manager] Launching pre-built production server on port ${PORT}..."
    exec node dist/server.js
elif [ -f "server.js" ]; then
    echo "[MikroTik Manager] Launching server.js on port ${PORT}..."
    exec node server.js
elif [ -f "server.ts" ]; then
    echo "[MikroTik Manager] Attempting to run server.ts with tsx on port ${PORT}..."
    exec npx tsx server.ts
else
    echo "================================================================================"
    echo "[MikroTik Manager] CRITICAL ERROR: No executable entrypoint found in /app!"
    echo "Expected 'dist/server.js' or 'server.ts'."
    echo "Please ensure your repository includes the compiled 'dist/' directory."
    echo "================================================================================"
    exit 1
fi
