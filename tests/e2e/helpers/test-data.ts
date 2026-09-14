import { PrismaClient } from '../../../generated/prisma/client'
import { createDbAdapter } from '../../../app/lib/db-adapter'

const adapter = createDbAdapter()
const prisma = new PrismaClient({ adapter })

// Clerk test users. An address containing `+clerk_test` is a Clerk *test* email:
// it never sends a real message and accepts the fixed OTP `424242`, which is what
// lets @clerk/testing sign in without a mailbox. Add a role here and in
// AUTH_ROLES (helpers/auth.ts) to give it a captured session.
export const OWNER_EMAIL = 'admin+clerk_test@avit.dev'

// Rows created by prisma/seed.ts. Specs assert against these rather than creating
// their own, so a spec that only reads costs nothing to set up.
export const SEED_USER_EMAIL = 'alice@example.com'
export const SEED_USER_NAME = 'Alice Johnson'
export const SEED_USER_COUNT = 3

// Assert the seed actually ran before a spec blames the app for empty data. Call
// it from global setup, not from individual specs.
export async function assertSeedData() {
  const count = await prisma.user.count()

  if (count < SEED_USER_COUNT) {
    throw new Error(
      `Expected at least ${SEED_USER_COUNT} seeded users, found ${count}. Run \`pnpm seed\` before the e2e suite.`
    )
  }
}

// Delete anything a spec created, keyed by a convention the specs follow, so a
// failed run cannot leak rows into the next one. Seeded rows are left alone.
export async function deleteTestArtifacts() {
  await prisma.post.deleteMany({ where: { title: { startsWith: 'e2e:' } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+' } } })
}

export { prisma }
