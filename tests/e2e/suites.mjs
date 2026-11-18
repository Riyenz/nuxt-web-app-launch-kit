// The E2E list CI runs, and the paths that decide whether it runs at all.
//
// CORE_SPECS is the release gate (.github/workflows/e2e.yml): the flows the product cannot ship
// without. Add a spec here when it guards one of those flows; every other spec runs on a
// developer machine before the pull request exists. tests/unit/e2e-gate.test.ts fails if a name
// here has no file.

export const CORE_SPECS = [
  'tests/e2e/login.spec.ts',
  'tests/e2e/dashboard.spec.ts',
  'tests/e2e/users-api.spec.ts'
]

// Paths that can change how the built app, its database or the E2E job itself behaves.
export const RUNTIME_PATTERNS = [
  /^(app|generated|prisma|server|shared)\//,
  /^(nuxt|playwright|prisma|vitest)\.config\./,
  /^(package\.json|pnpm-lock\.yaml|tsconfig\.json)$/,
  // nuxt.config.ts and the migrate step import it.
  /^scripts\/migration-phases\.mjs$/,
  /^scripts\/ci\//,
  /^tests\/e2e\//,
  /^\.github\/workflows\/e2e\.yml$/
]

// Paths that sit beside runtime code but cannot change it. Specs assert on role, text and test
// id, never on computed styles, so a CSS-only diff proves nothing either way.
export const NO_E2E_PATTERNS = [
  /^app\/assets\/css\//,
  /\.md$/
]
