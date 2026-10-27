#!/usr/bin/env sh
set -eu

echo "[MikroTik Manager] Starting MikroTik Gateway Manager v1.3.5 (Home Assistant & CasaOS)..."

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
    exec node dist/server.js
fi

if [ -f "server.js" ]; then
    exec node server.js
fi

if [ -f "server.ts" ]; then
    exec npx tsx server.ts
fi

echo "[MikroTik Manager] No application entrypoint was found in /app. The container was started successfully, but there is nothing to run."
exec tail -f /dev/null
