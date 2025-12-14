# CI/CD

**Read this when**: You need to understand the continuous integration pipeline, troubleshoot CI failures, or modify the GitHub Actions workflow.

## GitHub Actions Workflow

The project uses GitHub Actions for continuous integration. The workflow file is located at `.github/workflows/ci.yml`.

### Triggers

The CI workflow runs on:
- Every push to any branch
- Pull requests

### CI Pipeline Steps

1. **Lint check**: Runs ESLint to validate code style
2. **Type checking**: Runs TypeScript type checker with vue-tsc

### Important Notes

- **Package manager**: CI uses **Bun** (same as local development)
  - Both local and CI use Bun for consistency
- **No build step**: The workflow only validates code quality (lint + typecheck)
- **No tests**: Testing step not yet configured

## Local Validation Before Push

Before pushing code, ensure it will pass CI by running:

```bash
# Run both checks
make check

# Or run individually
bun run lint
bun run typecheck
```

See [agent-workflow.md](agent-workflow.md) for the complete workflow.

## Troubleshooting CI Failures

### Lint failures
- Run `bun run lint` locally to see the same errors
- Fix lint errors according to [naming-conventions.md](naming-conventions.md)
- Auto-fix some issues: `bun run lint --fix` (if configured)

### Type check failures
- Run `bun run typecheck` locally
- Check for type errors in modified files
- Ensure Prisma Client is regenerated after schema changes

## Workflow Configuration

The workflow is defined in `.github/workflows/ci.yml`. Key configuration:
- Bun version (uses latest)
- Steps for dependency installation, lint, and typecheck
