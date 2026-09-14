#!/usr/bin/env bash
set -euo pipefail

echo "=== Paseo Worktree Teardown ==="

node ./.paseo/local-db.mjs teardown

echo "=== Teardown complete ==="
