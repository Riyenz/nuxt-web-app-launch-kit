# Workflow Phases

The four phases every code change must go through.

## 1. Planning Phase

Before writing code:

- Read existing code (never propose changes to unread code)
- Understand architecture and patterns
- Plan changes that align with codebase
- Use TodoWrite for multi-step tasks

## 2. Implementation Phase

Write code following project conventions:

- Use `is` prefix for booleans (not `has`)
- Follow 1TBS brace style
- No trailing commas
- Import Prisma from `~/lib/prisma`
- Use Bun (not npm/yarn/pnpm)
- Avoid over-engineering
- Make only necessary changes

## 3. Validation Phase (MANDATORY)

Run validation checks (see [Commands Reference](commands-reference.md)):
- Run lint and typecheck
- Fix all errors (see [Validation Guide](validation-guide.md))
- Re-run until both pass
- **DO NOT mark complete if checks fail**

## 4. Completion Phase

Only after validation passes:
- Mark todos as completed
- Summarize changes
- Report to user

## Phase Transitions

Never skip phases:
- Planning → Implementation (after understanding code)
- Implementation → Validation (after writing code)
- Validation → Completion (only if checks pass)
- If validation fails → Back to Implementation

## Flow Diagram

```
Planning
  ↓
Implementation
  ↓
Validation
  ├─ Pass → Completion ✓
  └─ Fail → Back to Implementation ↻
```
