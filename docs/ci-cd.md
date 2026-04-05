# CI/CD

**Read this when**: You need to understand the continuous integration pipeline, troubleshoot CI failures, or modify the GitHub Actions workflows.

## GitHub Actions Workflows

The project uses GitHub Actions for continuous integration and PR database provisioning.

- `.github/workflows/ci.yml` runs linting and type checking on pushes.
- `.github/workflows/pr-neon-branch.yml` provisions a Neon branch per PR targeting `master`, applies Prisma migrations, and updates the Vercel preview `DATABASE_URL`.

### Triggers

The CI workflow runs on:
- Every push to any branch

The PR Neon workflow runs on pull request lifecycle events targeting `master`:
- `opened`
- `reopened`
- `synchronize`
- `closed`

### CI Pipeline Steps

1. **Lint check**: Runs ESLint to validate code style
2. **Type checking**: Runs TypeScript type checker with vue-tsc

### Important Notes

- **Package manager**: CI uses **pnpm** (same as local development)
  - Both local and CI use pnpm for consistency
- **No build step**: The CI workflow only validates code quality (lint + typecheck)
- **No tests**: Testing step not yet configured
- **Preview databases**: PR previews get an isolated Neon branch named `pr-<number>`
- **Fork PRs**: The Neon workflow skips forked PRs because GitHub does not expose repository secrets there

## Local Validation Before Push

Before pushing code, ensure it will pass CI by running:

```bash
# Run both checks
make check

# Or run individually
pnpm run lint
pnpm run typecheck
```

See [agent-workflow.md](agent-workflow.md) for the complete workflow.

## Troubleshooting CI Failures

### Lint failures
- Run `pnpm run lint` locally to see the same errors
- Fix lint errors according to [naming-conventions.md](naming-conventions.md)
- Auto-fix some issues: `pnpm run lint --fix` (if configured)

### Type check failures
- Run `pnpm run typecheck` locally
- Check for type errors in modified files
- Ensure Prisma Client is regenerated after schema changes

## Workflow Configuration

The workflows are defined in `.github/workflows/ci.yml` and `.github/workflows/pr-neon-branch.yml`.

Key configuration:
- pnpm version is managed via the `packageManager` field
- CI installs dependencies, then runs lint and typecheck
- PR Neon provisioning requires GitHub Actions secrets for Neon and Vercel

See [neon-database-branching.md](neon-database-branching.md) for the full PR database setup.
