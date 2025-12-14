# Agent Workflow

Main workflow guide for LLM agents. Ensures code quality and prevents bugs.

## Core Principle

**Never introduce bad code.** All changes must pass lint and typecheck before completion.

## The Four Phases

All code changes follow these phases (details in [Workflow Phases](workflow-phases.md)):

1. **Planning** - Read code, understand patterns
2. **Implementation** - Write code following conventions
3. **Validation** - Run lint + typecheck, fix errors
4. **Completion** - Mark done, inform user

## Mandatory Validation

After every code change, run validation (see [Commands Reference](commands-reference.md)):
- Lint must pass
- Typecheck must pass

**Both required before marking complete.**

## Documentation

- **[Workflow Phases](workflow-phases.md)** - Detailed 4-phase process
- **[Coding Scenarios](coding-scenarios/index.md)** - Task-specific guides
- **[Validation Guide](validation-guide.md)** - Error handling
- **[Error Examples](error-examples.md)** - Common fixes
- **[Commands Reference](commands-reference.md)** - All commands

## Quick Start

1. Read existing code
2. Make changes (use `is` prefix, 1TBS braces, no trailing commas, use Bun)
3. Run validation
4. Fix errors (see [Error Examples](error-examples.md))
5. Mark complete only after validation passes

## Project Conventions

- **Booleans**: `is` prefix only
- **Prisma**: Import from `~/lib/prisma`
- **Package Manager**: Bun only
- **Style**: ESLint config (1TBS, no trailing commas)

## When Validation Fails

- Fix errors using [Validation Guide](validation-guide.md)
- Check [Error Examples](error-examples.md) for patterns
- If blocked, ask for help (don't mark complete)

## Golden Rule

**lint + typecheck must pass. No exceptions.**
