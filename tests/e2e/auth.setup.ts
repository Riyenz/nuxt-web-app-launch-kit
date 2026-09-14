import { test as setup } from '@playwright/test'
import { AUTH_ROLES, authStatePath, captureSession } from './helpers/auth'

// One-time authentication: sign in as each role and persist its Clerk session as
// storageState for the real test projects to replay. These are the only live Clerk
// sign-ins in the suite, and they run serially (default, single file) so they never
// burst the development instance's rate limit the way per-test sign-ins do.
for (const [role, emailAddress] of Object.entries(AUTH_ROLES)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await captureSession(page, emailAddress, authStatePath(role as keyof typeof AUTH_ROLES))
  })
}
