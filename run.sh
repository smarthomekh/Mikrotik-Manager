#!/usr/bin/env sh
set -eu

echo "[MikroTik Manager] Starting MikroTik Gateway Manager v1.3.7 (Home Assistant & CasaOS)..."

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
    echo "[MikroTik Manager] Launching production server on port ${PORT}"
    exec node dist/server.js
fi

if [ -f "server.js" ]; then
    echo "[MikroTik Manager] Launching server.js on port ${PORT}"
    exec node server.js
fi

if [ -f "server.ts" ]; then
    echo "[MikroTik Manager] Launching TypeScript server with tsx on port ${PORT}"
    exec npx tsx server.ts
fi

echo "[MikroTik Manager] ERROR: No executable server file found in /app."
exit 1
