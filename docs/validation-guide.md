# Validation Guide

How to validate code quality before marking tasks complete.

## The Process

1. Make code changes
2. Run lint and typecheck (see [Commands Reference](commands-reference.md))
3. Fix any errors (see [Error Examples](error-examples.md))
4. Repeat until both pass
5. Mark task complete

**Validation is mandatory. No exceptions.**

## Handling Lint Errors

1. Run lint
2. Try auto-fix first
3. If auto-fix fails, fix manually using [Error Examples](error-examples.md)
4. Re-run until passing

Common fixes: Remove trailing commas, use 1TBS braces, fix Tailwind order.

## Handling Type Errors

1. Run typecheck
2. Read error messages
3. Fix using patterns in [Error Examples](error-examples.md)
4. Re-run until passing

Common fixes: Add type annotations, fix Prisma imports, add null checks.

## When Blocked

If you cannot fix errors:

1. Document exact errors (copy messages, file names, line numbers)
2. Explain what you tried
3. Ask for help (AskUserQuestion or inform user)
4. **DO NOT mark complete**

## Pre-Commit Checklist

- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Code follows conventions
- [ ] Changes work as expected
- [ ] Todos marked completed
- [ ] User informed

## Resources

- **[Commands Reference](commands-reference.md)** - All validation commands
- **[Error Examples](error-examples.md)** - Common errors and fixes
- **[Workflow Phases](workflow-phases.md)** - Validation phase details

## Golden Rule

**Both lint and typecheck must pass before completing any task.** If validation fails, fix and validate again. Never skip or mark complete with errors.
