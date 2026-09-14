import fs from 'node:fs'
import path from 'node:path'
import { clerk } from '@clerk/testing/playwright'
import { expect, type BrowserContext, type Page } from '@playwright/test'
import { OWNER_EMAIL } from './test-data'

// Every role's Clerk session is minted ONCE by the `setup` project (auth.setup.ts)
// and replayed into each test's context below. Signing in per test hammers Clerk's
// rate-limited development instance and makes sign-in flaky; capturing each session
// once keeps a whole suite to a handful of real sign-ins.
//
// To add a role: add its Clerk test email here, then write a `signInAsX` wrapper at
// the bottom. auth.setup.ts picks it up automatically.
export const AUTH_ROLES = {
  owner: OWNER_EMAIL
} as const

export type AuthRole = keyof typeof AUTH_ROLES

// Playwright runs from the repo root, so anchor the auth cache there.
const authDir = path.join(process.cwd(), 'tests', 'e2e', '.auth')

export function authStatePath(role: AuthRole) {
  return path.join(authDir, `${role}.json`)
}

const emailToRole = new Map<string, AuthRole>(
  Object.entries(AUTH_ROLES).map(([role, email]) => [email, role as AuthRole])
)

interface StoredState {
  cookies?: Parameters<BrowserContext['addCookies']>[0]
  origins?: Array<{ localStorage?: Array<{ name: string, value: string }> }>
}

// Mint a role's Clerk session interactively and persist it as Playwright
// storageState. Called once per role by the setup project.
export async function captureSession(page: Page, emailAddress: string, statePath: string) {
  // 'commit' avoids net::ERR_ABORTED when Clerk's middleware answers the first
  // request with a __clerk_handshake redirect; clerk.loaded() still gates on Clerk.
  await page.goto('/', { waitUntil: 'commit' })
  await clerk.loaded({ page })
  await clerk.signIn({ page, emailAddress })
  // Revisit so Clerk finishes writing the signed-in client/session cookies.
  await page.goto('/', { waitUntil: 'commit' })
  await clerk.loaded({ page })
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  await page.context().storageState({ path: statePath })
}

// Replay a captured session into this test's browser context. Cookies restore the
// Clerk session (it refreshes the short-lived session JWT from the longer-lived
// client cookie); localStorage is seeded before any page script runs.
async function applyStoredSession(page: Page, role: AuthRole) {
  const statePath = authStatePath(role)

  if (!fs.existsSync(statePath)) {
    throw new Error(
      `No captured session at ${statePath}. The 'setup' project mints it — run the suite through playwright.config.ts rather than a bare \`playwright test <file>\`.`
    )
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as StoredState

  if (state.cookies?.length) {
    await page.context().addCookies(state.cookies)
  }

  const entries = state.origins?.flatMap(origin => origin.localStorage ?? []) ?? []
  if (entries.length) {
    await page.addInitScript((items) => {
      for (const { name, value } of items) {
        try {
          window.localStorage.setItem(name, value)
        } catch {
          // Ignore origins that reject storage (e.g. cross-origin Clerk frames).
        }
      }
    }, entries)
  }
}

// Restore a captured session without asserting a destination. The caller drives
// navigation itself — used by flows whose landing route depends on state created
// during the test.
export async function signInWithEmail(page: Page, emailAddress: string) {
  const role = emailToRole.get(emailAddress)
  if (!role) {
    throw new Error(`No captured session for ${emailAddress}. Add it to AUTH_ROLES.`)
  }

  await applyStoredSession(page, role)
  await page.goto('/', { waitUntil: 'commit' })
  // The replayed __session JWT expires ~60s after capture. Waiting for clerk-js to
  // boot lets it re-issue the session cookie from the long-lived client token, so an
  // immediate page.request call doesn't go out with an expired JWT (401).
  await clerk.loaded({ page })
}

async function signIn(page: Page, emailAddress: string, destination: string | RegExp) {
  await signInWithEmail(page, emailAddress)
  await page.goto(typeof destination === 'string' ? destination : '/app/dashboard', {
    waitUntil: 'commit'
  })
  await expect(page).toHaveURL(destination)
}

export async function signInAsOwner(page: Page) {
  await signIn(page, OWNER_EMAIL, /\/app\/dashboard/)
}
