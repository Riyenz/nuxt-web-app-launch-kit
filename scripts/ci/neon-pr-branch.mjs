const NEON_API = 'https://console.neon.tech/api/v2'

function getRequiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function getBranchName(prNumber) {
  return `pr-${prNumber}`
}

async function neonFetch(path, apiKey, options = {}) {
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

    if (response.ok) {
      return response
    }

    if (response.status === 404 && options.allow404) {
      return response
    }

    if ((response.status === 423 || response.status >= 500) && attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      continue
    }

    const body = await response.text()
    throw new Error(`Neon API ${options.method || 'GET'} ${path} returned ${response.status}: ${body}`)
  }
}

async function listBranches(projectId, apiKey) {
  const branches = []
  let cursor = null

  do {
    const params = new URLSearchParams()

    if (cursor) {
      params.set('cursor', cursor)
    }

    const query = params.size > 0 ? `?${params.toString()}` : ''
    const response = await neonFetch(`/projects/${projectId}/branches${query}`, apiKey)
    const data = await response.json()
    branches.push(...data.branches)
    cursor = data.pagination?.next ?? null
  } while (cursor)

  return branches
}

async function findBranchByName(projectId, apiKey, branchName) {
  const branches = await listBranches(projectId, apiKey)
  return branches.find(branch => branch.name === branchName)
}

async function createBranch(projectId, apiKey, branchName, parentBranchName, existingBranches = null) {
  const branches = existingBranches || await listBranches(projectId, apiKey)
  const parentBranch = branches.find(branch => branch.name === parentBranchName)

  if (!parentBranch) {
    throw new Error(`Parent branch "${parentBranchName}" not found in project ${projectId}`)
  }

  const response = await neonFetch(`/projects/${projectId}/branches`, apiKey, {
    method: 'POST',
    body: JSON.stringify({
      branch: {
        name: branchName,
        parent_id: parentBranch.id
      },
      endpoints: [
        {
          type: 'read_write'
        }
      ]
    })
  })
  const data = await response.json()
  return data.branch
}

async function deleteBranch(projectId, apiKey, branchId) {
  await neonFetch(`/projects/${projectId}/branches/${branchId}`, apiKey, {
    method: 'DELETE',
    allow404: true
  })
}

async function getConnectionString(projectId, apiKey, branchId, databaseName = 'neondb', roleName = 'neondb_owner') {
  const response = await neonFetch(
    `/projects/${projectId}/connection_uri?branch_id=${branchId}&database_name=${databaseName}&role_name=${roleName}&pooled=true`,
    apiKey
  )
  const data = await response.json()
  return data.uri
}

async function setup(prNumber) {
  const projectId = getRequiredEnv('NEON_PROJECT_ID')
  const apiKey = getRequiredEnv('NEON_API_KEY')
  const parentBranch = process.env.NEON_PARENT_BRANCH || 'development'
  const branchName = getBranchName(prNumber)

  const branches = await listBranches(projectId, apiKey)
  let branch = branches.find(existingBranch => existingBranch.name === branchName)

  if (!branch) {
    branch = await createBranch(projectId, apiKey, branchName, parentBranch, branches)
  }

  const databaseUrl = await getConnectionString(projectId, apiKey, branch.id)
  process.stdout.write(databaseUrl)
}

async function teardown(prNumber) {
  const projectId = getRequiredEnv('NEON_PROJECT_ID')
  const apiKey = getRequiredEnv('NEON_API_KEY')
  const branchName = getBranchName(prNumber)
  const branch = await findBranchByName(projectId, apiKey, branchName)

  if (!branch) {
    return
  }

  await deleteBranch(projectId, apiKey, branch.id)
}

const [command, prNumber] = process.argv.slice(2)

if (!command || !prNumber || !/^\d+$/.test(prNumber)) {
  console.error('Usage: node scripts/ci/neon-pr-branch.mjs <setup|teardown> <pr-number>')
  process.exit(1)
}

if (command === 'setup') {
  setup(prNumber).catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
} else if (command === 'teardown') {
  teardown(prNumber).catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
} else {
  console.error('Usage: node scripts/ci/neon-pr-branch.mjs <setup|teardown> <pr-number>')
  process.exit(1)
}
