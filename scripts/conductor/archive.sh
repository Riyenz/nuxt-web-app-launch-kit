#!/usr/bin/env bash
set -euo pipefail

echo "=== Conductor Workspace Archive ==="

node ./scripts/conductor/neon-workspace-db.mjs archive

echo "=== Archive complete ==="
