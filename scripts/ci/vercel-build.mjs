// The whole Vercel build, in one process.
//
// A preview build creates its own Neon branch before anything reads DATABASE_URL, so the
// database always exists before the build that uses it. There is no second system to race:
// the process that needs the database is the process that makes it. Environment does not
// survive between `&&` steps in a shell build command, which is why generate, build and
// migrate are spawned from here rather than chained in vercel.json.

import { spawnSync } from 'node:child_process'
import { getConnectionString, resolvePreviewBranch } from './preview-branch.mjs'
import { getPullRequestState } from './pull-request-state.mjs'

// A push to develop deploys the shared development database on purpose. It is also the
// only writer of that database now that migrations run inside this build.
const SHARED_DATABASE_REFS = ['develop']

// A build whose pull request already finished gets no database, but prisma.config.ts refuses to
// load without DATABASE_URL. Nothing connects to this address, and a query that tried would fail
// at once rather than reach a database this build does not own.
const UNUSED_DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:5432/unused'

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

  // A build can be queued for longer than its pull request stays open. The cleanup workflow
  // deletes the database the second that pull request closes, so a build that starts after it
  // must not create the database again: nothing deletes a second copy, and it keeps a slot for
  // good. The question is about this commit, so a push made after the close still gets its
  // database. An unanswered check reads as "still open" and changes nothing.
  const pullRequest = await getPullRequestState({
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    gitRef,
    owner: process.env.VERCEL_GIT_REPO_OWNER,
    repo: process.env.VERCEL_GIT_REPO_SLUG,
    token: process.env.GITHUB_PREVIEW_TOKEN
  })

  // The question above was its only reader, so no command this build spawns sees the token.
  delete process.env.GITHUB_PREVIEW_TOKEN

  if (pullRequest.isFinished) {
    console.log(`Preview build for "${gitRef}": ${pullRequest.reason}, so this build gets no database`)
    return { databaseUrl: UNUSED_DATABASE_URL, isOwnBranch: false, isDatabaseSkipped: true }
  }

  console.log(`Preview build: resolving the Neon branch for "${gitRef}" (${pullRequest.reason})`)
  const { branch, isCreated } = await resolvePreviewBranch(projectId, apiKey, gitRef, parentBranch)
  console.log(`${isCreated ? 'Created' : 'Reusing'} Neon branch "${branch.name}" (${branch.id})`)

  return { databaseUrl: await getConnectionString(projectId, apiKey, branch.id), isOwnBranch: true }
}

async function main() {
  const { databaseUrl, isOwnBranch, isDatabaseSkipped } = await resolveDatabaseUrl()

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

  // Migrate last: the deployment in production keeps serving on the new schema until this one goes
  // live, so the build minutes stay out of that window and a failed build never touches the database.
  run('prisma', ['generate'])
  run('nuxt', ['build'])

  // A build with no database of its own still produces a deployment, so the merged branch does
  // not show up as a failure. Its app pages have nothing to read, which is what a closed pull
  // request deserves; the marketing pages are built in and still work.
  if (isDatabaseSkipped) {
    console.log('\nSkipping prisma migrate deploy: this build has no database')
    return
  }

  run('node', ['scripts/ci/deploy-migrate.mjs'])
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
