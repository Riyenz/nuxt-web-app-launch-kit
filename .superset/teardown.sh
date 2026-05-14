#!/usr/bin/env bash
set -euo pipefail

echo "=== Superset Workspace Teardown ==="

node ./.superset/neon-workspace-db.mjs teardown

echo "=== Teardown complete ==="
