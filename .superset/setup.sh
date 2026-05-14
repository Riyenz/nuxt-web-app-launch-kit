#!/usr/bin/env bash
set -euo pipefail

echo "=== Superset Workspace Setup ==="

if [ -n "${SUPERSET_ROOT_PATH:-}" ] && [ -f "$SUPERSET_ROOT_PATH/.env" ]; then
  echo "Copying root .env..."
  cp "$SUPERSET_ROOT_PATH/.env" .env
fi

echo "Setting up Neon workspace branch..."
node ./.superset/neon-workspace-db.mjs setup

echo "Running project setup..."
make setup

echo "Running database migrations..."
pnpm exec prisma migrate dev

echo "=== Setup complete ==="
