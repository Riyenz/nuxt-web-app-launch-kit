import 'dotenv/config'
import { clerkSetup } from '@clerk/testing/playwright'
import { assertSeedData, deleteTestArtifacts } from './helpers/test-data'

export default async function globalSetup() {
  // Clerk's Playwright helpers read their own variable names; this project stores
  // the same keys under the NUXT_ names Nuxt expects.
  process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY
    || process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
    || process.env.NUXT_CLERK_SECRET_KEY

  await clerkSetup()
  await assertSeedData()
  // A previous run that crashed mid-test leaves its rows behind; clear them before
  // the suite asserts on counts.
  await deleteTestArtifacts()
}
