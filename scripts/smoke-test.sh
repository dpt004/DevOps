#!/usr/bin/env sh
set -eu

BACKEND_URL="http://localhost:4000/api/health"
FRONTEND_URL="http://localhost:8080"

echo "Checking backend: $BACKEND_URL"
curl --fail --silent "$BACKEND_URL" | grep '"status": "ok"' >/dev/null

echo "Checking frontend: $FRONTEND_URL"
curl --fail --silent "$FRONTEND_URL" >/dev/null

echo "Smoke test passed."
