# Neon Database Branching

**Read this when**: You need to understand how per-workspace and per-PR database branches work, or you need to set up the required secrets.

## Overview

This project uses [Neon](https://neon.tech) database branching to give each developer workspace and each pull request its own isolated database. All branches are forked from a shared parent branch (default: `development`), so they start with the same schema and seed data.

There are two independent systems:

| System | Trigger | Branch naming | Script |
|---|---|---|---|
| Conductor workspaces | Workspace setup/archive | `cw-<workspace-slug>` | `scripts/conductor/neon-workspace-db.mjs` |
| GitHub Actions | PR opened/closed against `master` | `pr-<number>` | `scripts/ci/neon-pr-branch.mjs` |

## How It Works

### Conductor Workspace Branches

When a Conductor workspace is created, `conductor.json` runs the setup script:

1. Copies the root `.env` into the workspace if `CONDUCTOR_ROOT_PATH` is set
2. Creates a Neon branch named `cw-<workspace-name>` forked from the parent branch
3. Writes the new `DATABASE_URL` into the workspace `.env`
4. Saves branch metadata to `.context/neon-workspace.json`
5. Runs `make setup` and `prisma migrate dev`

When the workspace is archived, the Neon branch is deleted.

### CI PR Branches

The GitHub Actions workflow at `.github/workflows/pr-neon-branch.yml` runs on PRs targeting `master`:

1. On open/reopen/sync, it creates or reuses a Neon branch `pr-<number>`
2. It runs `prisma migrate deploy` against that branch
3. It writes the resulting `DATABASE_URL` into the matching Vercel preview environment for the PR's git branch
4. On close, it deletes the Neon branch and removes the preview `DATABASE_URL`

Fork PRs are skipped because repository secrets are not exposed to them.

## Required Configuration

### Local / Conductor `.env`

```bash
NEON_PROJECT_ID=<your-neon-project-id>
NEON_API_KEY=<your-neon-api-key>
NEON_PARENT_BRANCH=development
```

### GitHub Actions Secrets

Set these in GitHub at `Settings -> Secrets and variables -> Actions`:

| Secret | Description |
|---|---|
| `NEON_PROJECT_ID` | Neon project ID |
| `NEON_API_KEY` | Neon API key for branch management |
| `NEON_PARENT_BRANCH` | Optional parent branch to fork from; defaults to `development` |
| `VERCEL_ORG_ID` | Vercel team/org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VERCEL_TOKEN` | Vercel token with environment-variable permissions |

## Operational Notes

- The shared Neon parent branch must already exist and have the expected schema baseline.
- `prisma migrate deploy` is used in CI so previews stay aligned with committed migrations.
- Vercel preview env vars are keyed by the PR head branch name, not the PR number.
- Stale Neon branches can still accumulate if a workflow is interrupted; clean up orphaned `pr-*` branches in Neon periodically.
