#!/usr/bin/env bash
set -euo pipefail

echo "=== Paseo Worktree Setup ==="

# Paseo starts each worktree without ignored files, so .env has to be recreated.
# Prefer the source checkout's .env — it holds the real Clerk keys — and fall
# back to the committed .env.example placeholders.
if [ ! -f .env ]; then
  source_checkout="${PASEO_SOURCE_CHECKOUT_PATH:-}"
  if [ -z "$source_checkout" ]; then
    # PASEO_SOURCE_CHECKOUT_PATH isn't always populated; the shared git
    # directory always points back at the checkout this worktree came from.
    git_common_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
    if [ -n "$git_common_dir" ]; then
      source_checkout="$(dirname "$git_common_dir")"
    fi
  fi

  if [ -n "$source_checkout" ] && [ -f "$source_checkout/.env" ]; then
    echo "Copying .env from $source_checkout ..."
    cp "$source_checkout/.env" .env
  else
    echo "No source .env found; starting from .env.example."
    cp .env.example .env
  fi
fi

echo "Installing dependencies and generating the Prisma client..."
pnpm bootstrap

echo "Provisioning local PGlite Postgres..."
node ./.paseo/local-db.mjs setup

echo "=== Setup complete ==="

# The database is usable either way, but the dev server refuses to boot without
# Clerk keys — say so here rather than at first `make dev`.
if ! grep -q '^NUXT_CLERK_SECRET_KEY=sk_' .env 2>/dev/null; then
  echo
  echo "NOTE: NUXT_CLERK_SECRET_KEY / NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY are not set in .env."
  echo "  Add them from dashboard.clerk.com -> API Keys, then run 'make doctor'."
fi
