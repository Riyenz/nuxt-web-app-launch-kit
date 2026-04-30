#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI not found. Install from: https://cli.github.com"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Error: Not logged into gh CLI. Run: gh auth login"
  exit 1
fi

if [ ! -f .env ]; then
  echo "Error: .env file not found. Run: cp .env.example .env"
  exit 1
fi

declare -A env_vars
while IFS= read -r line; do
  trimmed="${line#"${line%%[![:space:]]*}"}"
  [[ -z "$trimmed" || "$trimmed" == \#* ]] && continue
  if [[ "$trimmed" =~ ^([^=]+)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    env_vars["$key"]="$value"
  fi
done < .env

SECRETS=(
  NEON_PROJECT_ID
  NEON_API_KEY
  NEON_PARENT_BRANCH
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
  VERCEL_TOKEN
)

echo "Syncing secrets to GitHub Actions..."
echo ""

synced=0
skipped=0

for secret in "${SECRETS[@]}"; do
  value="${env_vars[$secret]:-}"
  if [ -n "$value" ]; then
    printf "  Setting %-30s" "$secret..."
    gh secret set "$secret" --body "$value"
    echo "done"
    ((synced++)) || true
  else
    echo "  Skipping $secret (not set in .env)"
    ((skipped++)) || true
  fi
done

echo ""
echo "Done: $synced secret(s) synced, $skipped skipped."
echo ""
echo "View secrets at: $(gh repo view --json url -q .url)/settings/secrets/actions"
