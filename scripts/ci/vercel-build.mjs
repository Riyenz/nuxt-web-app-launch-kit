// The whole Vercel build, in one process.
//
// A preview build creates its own Neon branch before anything reads DATABASE_URL, so the
// database always exists before the build that uses it. There is no second system to race:
// the process that needs the database is the process that makes it. Environment does not
// survive between `&&` steps in a shell build command, which is why generate, migrate and
// build are spawned from here rather than chained in vercel.json.

import { spawnSync } from 'node:child_process'
import { getConnectionString, resolvePreviewBranch } from './preview-branch.mjs'

// A push to develop deploys the shared development database on purpose. It is also the
// only writer of that database now that migrations run inside this build.
const SHARED_DATABASE_REFS = ['develop']

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

async function resolveDatabaseUrl() {
  const environment = process.env.VERCEL_ENV
  const gitRef = process.env.VERCEL_GIT_COMMIT_REF

  if (environment === 'production') {
    console.log('Production build: using the stored DATABASE_URL')
    return { databaseUrl: getRequiredEnv('DATABASE_URL'), isOwnBranch: false }
  }

  if (!gitRef) {
    console.log('No VERCEL_GIT_COMMIT_REF: using the stored DATABASE_URL')
    return { databaseUrl: getRequiredEnv('DATABASE_URL'), isOwnBranch: false }
  }

  if (SHARED_DATABASE_REFS.includes(gitRef)) {
    console.log(`Branch "${gitRef}": using the shared development database`)
    return { databaseUrl: getRequiredEnv('DATABASE_URL'), isOwnBranch: false }
  }

  const projectId = getRequiredEnv('NEON_PROJECT_ID')
  const apiKey = getRequiredEnv('NEON_PREVIEW_API_KEY')
  const parentBranch = process.env.NEON_PARENT_BRANCH || 'development'

  console.log(`Preview build: resolving the Neon branch for "${gitRef}"`)
  const { branch, isCreated } = await resolvePreviewBranch(projectId, apiKey, gitRef, parentBranch)
  console.log(`${isCreated ? 'Created' : 'Reusing'} Neon branch "${branch.name}" (${branch.id})`)

  return { databaseUrl: await getConnectionString(projectId, apiKey, branch.id), isOwnBranch: true }
}

async function main() {
  const { databaseUrl, isOwnBranch } = await resolveDatabaseUrl()

  if (!databaseUrl) {
    throw new Error('Could not resolve a DATABASE_URL for this build')
  }

  // prisma.config.ts reads this on load, and migrate deploy runs against it.
  process.env.DATABASE_URL = databaseUrl

  // Only a branch this build created is baked into the deployment. Production and the `develop`
  // preview keep their stored variable, so the production password never enters the build output
  // and stays rotatable without a rebuild. See nuxt.config.ts runtimeConfig.databaseUrl.
  if (isOwnBranch) {
    process.env.PREVIEW_DATABASE_URL = databaseUrl
  }

  run('prisma', ['generate'])
  run('node', ['scripts/ci/deploy-migrate.mjs'])
  run('nuxt', ['build'])
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
