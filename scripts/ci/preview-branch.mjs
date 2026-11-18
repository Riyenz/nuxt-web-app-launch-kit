// Neon API helpers shared by the Vercel build (which creates a preview branch) and the
// GitHub workflow (which deletes one). The build imports these rather than shelling out
// to a script and parsing its stdout.

const NEON_API = 'https://console.neon.tech/api/v2'

// Neon Free allows 10 branches per project. `production` and `development` are permanent, so
// a preview may take one of the remaining slots. The build fails when they are all taken
// rather than deleting somebody else's preview to make room.
export const PERMANENT_BRANCHES = ['production', 'development']
export const BRANCH_LIMIT = 10

// Names this flow must never create or delete. `sw-` is reserved for a workspace database
// created outside preview deploys, and `local-` for a hand-made branch.
export const RESERVED_PREFIXES = ['sw-', 'local-']

export function isPreviewBranchName(name) {
  return !PERMANENT_BRANCHES.includes(name) && !RESERVED_PREFIXES.some(prefix => name.startsWith(prefix))
}

export async function neonFetch(path, apiKey, options = {}) {
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(`${NEON_API}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (response.ok || (response.status === 404 && options.allow404)) {
      return response
    }

    // 429 is a rate limit and 423 is "another operation is running on this project"; two
    // deployments that start together hit both. Retrying keeps one of them from failing on a
    // transient 4xx that has nothing to do with the branch it asked for.
    const isRetryable = response.status >= 500 || response.status === 429 || response.status === 423

    if (attempt < maxRetries && isRetryable) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      continue
    }

    throw new Error(`Neon API ${options.method || 'GET'} ${path} returned ${response.status}: ${await response.text()}`)
  }
}

export async function listBranches(projectId, apiKey) {
  const response = await neonFetch(`/projects/${projectId}/branches`, apiKey)
  const { branches } = await response.json()

  return branches
}

// The Neon branch takes the git branch name verbatim, slashes included. The build knows its
// git ref but not the pull request number, and the cleanup job has to derive the same name
// from the same ref, so the ref is the only shared key.
export function getPreviewBranchName(gitRef) {
  return gitRef
}

function formatSlotError(branches) {
  const previews = branches.filter(branch => isPreviewBranchName(branch.name))
  const reserved = branches.filter(branch => !isPreviewBranchName(branch.name))

  return [
    `Neon has no free branch slot: the plan allows ${BRANCH_LIMIT} branches and ${branches.length} exist.`,
    '',
    `Preview databases (${previews.length}):`,
    previews.map(branch => `  - ${branch.name}`).join('\n') || '  (none)',
    '',
    `Permanent and reserved (${reserved.length}):`,
    reserved.map(branch => `  - ${branch.name}`).join('\n') || '  (none)',
    '',
    'Merge or close a pull request, or delete its git branch, to release that database, then '
    + 'redeploy. Nothing was deleted.'
  ].join('\n')
}

export async function resolvePreviewBranch(projectId, apiKey, gitRef, parentBranchName) {
  const branchName = getPreviewBranchName(gitRef)

  // A git branch named `production`, `development`, or `sw-anything` would otherwise resolve
  // to a database this flow does not own, and the build would migrate it. Refuse before any
  // Neon call.
  if (!isPreviewBranchName(branchName)) {
    throw new Error(
      `Refusing to use "${branchName}" as a preview database: that name is permanent or reserved. `
      + 'Rename the git branch.'
    )
  }

  const branches = await listBranches(projectId, apiKey)
  const existing = branches.find(branch => branch.name === branchName)

  if (existing) {
    return { branch: existing, isCreated: false }
  }

  if (branches.length >= BRANCH_LIMIT) {
    throw new Error(formatSlotError(branches))
  }

  const parent = branches.find(branch => branch.name === parentBranchName)

  if (!parent) {
    throw new Error(`Parent branch "${parentBranchName}" not found in project ${projectId}`)
  }

  const response = await neonFetch(`/projects/${projectId}/branches`, apiKey, {
    method: 'POST',
    body: JSON.stringify({
      branch: { name: branchName, parent_id: parent.id },
      endpoints: [{ type: 'read_write' }]
    })
  })
  const { branch } = await response.json()

  return { branch, isCreated: true }
}

// The direct (unpooled) endpoint. `prisma migrate deploy` takes a session-scoped advisory lock
// that Neon's transaction-mode pooler cannot hold, which fails intermittently with P1002.
export async function getConnectionString(projectId, apiKey, branchId) {
  const response = await neonFetch(
    `/projects/${projectId}/connection_uri?branch_id=${branchId}&database_name=neondb&role_name=neondb_owner&pooled=false`,
    apiKey
  )
  const { uri } = await response.json()

  return uri
}

export async function deletePreviewBranch(projectId, apiKey, gitRef) {
  const branchName = getPreviewBranchName(gitRef)

  if (!isPreviewBranchName(branchName)) {
    throw new Error(`Refusing to delete "${branchName}": that name is permanent or reserved`)
  }

  const branches = await listBranches(projectId, apiKey)
  const branch = branches.find(candidate => candidate.name === branchName)

  if (!branch) {
    return null
  }

  await neonFetch(`/projects/${projectId}/branches/${branch.id}`, apiKey, {
    method: 'DELETE',
    allow404: true
  })

  return branch.name
}

// Both cleanup triggers call this. It returns the log line rather than printing it, so a test
// can read which of the three outcomes happened.
export async function releasePreviewBranch(projectId, apiKey, gitRef) {
  const branchName = getPreviewBranchName(gitRef)

  // A git branch called `production`, `development`, `sw-...` or `local-...` names a database
  // this flow does not own. Deleting such a branch on GitHub must leave it alone, and must not
  // fail the job either: nothing is wrong, there is simply nothing here to delete.
  if (!isPreviewBranchName(branchName)) {
    return `"${branchName}" is a permanent or reserved database name: nothing deleted`
  }

  const deleted = await deletePreviewBranch(projectId, apiKey, gitRef)

  return deleted ? `Deleted preview database "${deleted}"` : 'No preview database to delete'
}
