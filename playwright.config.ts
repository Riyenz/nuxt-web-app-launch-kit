import { defineConfig, devices } from '@playwright/test'

const playwrightPort = process.env.PLAYWRIGHT_PORT || '3000'
const playwrightBaseURL = `http://localhost:${playwrightPort}`
const isCI = !!process.env.CI

// Specs are grouped by which shared seeded row they read or write. Each group is
// internally serialized (workers: 1) but the groups run concurrently in CI — so two
// specs touching the same row MUST land in the same group. Add a group rather than
// widening an existing one when a new spec owns different data.
const READ_ONLY_GROUP = [
  'dashboard.spec.ts',
  'users-api.spec.ts'
]
const LOGIN_GROUP = ['login.spec.ts']

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  // CI talks to a Postgres service container, where the groups above are independent
  // and run side by side. Locally the database is a `prisma dev` PGlite server, which
  // puts every TCP connection on one backend session — so the app and the test helpers
  // share the unnamed prepared statement, and a query issued while another connection
  // holds a transaction open dies with `08P01: bind message supplies N parameters, but
  // prepared statement "" requires 0`. Serial local runs keep only one of them talking
  // at a time.
  workers: isCI ? 4 : 1,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['html'], ['list']] : 'list',
  expect: { timeout: 15_000 },
  use: {
    baseURL: playwrightBaseURL,
    trace: 'on-first-retry'
  },
  webServer: {
    // CI serves the production build (built by the e2e workflow): the dev server's
    // on-demand compilation can't sustain concurrent projects, so first renders
    // intermittently blow past the expect/test timeouts.
    command: isCI
      ? 'node .output/server/index.mjs'
      : `pnpm dev --port ${playwrightPort}`,
    url: playwrightBaseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    // 4096 is below Node 24's own default on a developer machine, so it lowered the
    // local dev server's heap and killed it mid-run once compilation had warmed up.
    // The CI server is a compiled bundle and never approaches this.
    env: {
      NODE_OPTIONS: '--max-old-space-size=8192',
      PORT: playwrightPort
    }
  },
  projects: [
    {
      // Mints each role's Clerk session once (serially) into tests/e2e/.auth/*.json,
      // so the real projects replay a stored session instead of signing in per test
      // and hammering the Clerk development instance's rate limit.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      // Live sign-ins against Clerk's development instance intermittently take
      // 30s+; the default 30s test timeout leaves zero headroom.
      timeout: 120_000,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'read-only',
      testMatch: READ_ONLY_GROUP,
      workers: 1,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'login',
      testMatch: LOGIN_GROUP,
      workers: 1,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
