#!/usr/bin/env bash
set -euo pipefail

echo "=== Conductor Workspace Setup ==="

if [ -n "${CONDUCTOR_ROOT_PATH:-}" ] && [ -f "$CONDUCTOR_ROOT_PATH/.env" ]; then
  echo "Copying root .env..."
  cp "$CONDUCTOR_ROOT_PATH/.env" .env
fi

echo "Setting up Neon workspace branch..."
node ./scripts/conductor/neon-workspace-db.mjs setup

echo "Running project setup..."
make setup

echo "=== Setup complete ==="
