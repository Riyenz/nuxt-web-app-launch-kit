#!/usr/bin/env bash
set -euo pipefail

export CONDUCTOR_ROOT_PATH="${CONDUCTOR_ROOT_PATH:-${SUPERSET_ROOT_PATH:-}}"
export CONDUCTOR_WORKSPACE_NAME="${CONDUCTOR_WORKSPACE_NAME:-${SUPERSET_WORKSPACE_NAME:-$(basename "$PWD")}}"

./scripts/conductor/setup.sh
