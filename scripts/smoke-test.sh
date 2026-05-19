#!/usr/bin/env sh
set -eu

BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"

BACKEND_URL="http://localhost:${BACKEND_PORT}/api/health"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"

echo "Checking backend: $BACKEND_URL"
curl --fail --silent "$BACKEND_URL" | grep '"status": "ok"' >/dev/null

echo "Checking frontend: $FRONTEND_URL"
curl --fail --silent "$FRONTEND_URL" >/dev/null

echo "Smoke test passed."
