#!/usr/bin/env sh
set -e

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
exec node dist/server.js
