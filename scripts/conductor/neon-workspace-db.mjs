import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const NEON_API = 'https://console.neon.tech/api/v2'

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {}
  const env = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    let value = trimmed.slice(idx + 1)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function deriveBranchName(workspaceName) {
  const slug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `cw-${slug}`.slice(0, 63)
}

async function neonFetch(path, apiKey, options = {}) {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${NEON_API}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    if (res.ok) return res
    if (res.status === 404 && options.allow404) return res
    if (attempt < maxRetries && res.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * attempt))
      continue
    }
    const body = await res.text()
    throw new Error(`Neon API ${options.method || 'GET'} ${path} returned ${res.status}: ${body}`)
  }
}

async function listBranches(projectId, apiKey) {
  const res = await neonFetch(`/projects/${projectId}/branches`, apiKey)
  const data = await res.json()
  return data.branches
}

async function findBranchByName(projectId, apiKey, branchName) {
  const branches = await listBranches(projectId, apiKey)
  return branches.find(b => b.name === branchName)
}

async function createBranch(projectId, apiKey, branchName, parentBranchName) {
  const branches = await listBranches(projectId, apiKey)
  let parent = branches.find(b => b.name === parentBranchName)

  if (!parent) {
    const defaultBranch = branches.find(b => b.default) || branches[0]
    if (!defaultBranch) {
      throw new Error(`No branches found in project ${projectId}`)
    }
    console.log(`Parent branch "${parentBranchName}" not found. Creating it from "${defaultBranch.name}"...`)
    const res = await neonFetch(`/projects/${projectId}/branches`, apiKey, {
      method: 'POST',
      body: JSON.stringify({
        branch: { name: parentBranchName, parent_id: defaultBranch.id },
        endpoints: [{ type: 'read_write' }]
      })
    })
    const data = await res.json()
    parent = data.branch
    console.log(`Created parent branch "${parentBranchName}" (${parent.id})`)
  }

  const res = await neonFetch(`/projects/${projectId}/branches`, apiKey, {
    method: 'POST',
    body: JSON.stringify({
      branch: { name: branchName, parent_id: parent.id },
      endpoints: [{ type: 'read_write' }]
    })
  })
  const data = await res.json()
  return data.branch
}

async function deleteBranch(projectId, apiKey, branchId) {
  await neonFetch(`/projects/${projectId}/branches/${branchId}`, apiKey, {
    method: 'DELETE',
    allow404: true
  })
}

async function getConnectionString(projectId, apiKey, branchId, databaseName = 'neondb', roleName = 'neondb_owner') {
  const res = await neonFetch(
    `/projects/${projectId}/connection_uri?branch_id=${branchId}&database_name=${databaseName}&role_name=${roleName}&pooled=true`,
    apiKey
  )
  const data = await res.json()
  return data.uri
}

function rewriteEnv(envPath, newDatabaseUrl, extraVars = {}) {
  let content = readFileSync(envPath, 'utf-8')
  if (/^DATABASE_URL=.*/m.test(content)) {
    content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL=${newDatabaseUrl}`)
  } else {
    content += `${content.endsWith('\n') ? '' : '\n'}DATABASE_URL=${newDatabaseUrl}\n`
  }
  for (const [key, value] of Object.entries(extraVars)) {
    if (content.includes(`${key}=`)) {
      content = content.replace(new RegExp(`^${key}=.*`, 'm'), `${key}=${value}`)
    } else {
      content += `\n${key}=${value}`
    }
  }
  writeFileSync(envPath, content)
}

async function setup() {
  const workspaceDir = process.cwd()
  const rootPath = process.env.CONDUCTOR_ROOT_PATH
  const workspaceName = process.env.CONDUCTOR_WORKSPACE_NAME || basename(workspaceDir)

  const envPath = resolve(workspaceDir, '.env')
  if (!existsSync(envPath)) {
    if (rootPath && existsSync(resolve(rootPath, '.env'))) {
      const rootEnvContent = readFileSync(resolve(rootPath, '.env'), 'utf-8')
      writeFileSync(envPath, rootEnvContent)
    } else {
      console.error('ERROR: No .env file found. Copy root .env first or set CONDUCTOR_ROOT_PATH.')
      process.exit(1)
    }
  }

  const env = loadEnv(envPath)
  const projectId = env.NEON_PROJECT_ID || process.env.NEON_PROJECT_ID
  const apiKey = env.NEON_API_KEY || process.env.NEON_API_KEY
  const parentBranch = env.NEON_PARENT_BRANCH || process.env.NEON_PARENT_BRANCH || 'development'

  if (!projectId || !apiKey) {
    console.error('ERROR: NEON_PROJECT_ID and NEON_API_KEY are required in .env or environment.')
    process.exit(1)
  }

  const branchName = deriveBranchName(workspaceName)
  console.log(`Workspace: ${workspaceName}`)
  console.log(`Branch name: ${branchName}`)
  console.log(`Parent branch: ${parentBranch}`)

  let branch = await findBranchByName(projectId, apiKey, branchName)
  if (branch) {
    console.log(`Reusing existing branch: ${branch.id}`)
  } else {
    console.log(`Creating branch from "${parentBranch}"...`)
    branch = await createBranch(projectId, apiKey, branchName, parentBranch)
    console.log(`Created branch: ${branch.id}`)
  }

  console.log('Fetching connection string...')
  const connectionString = await getConnectionString(projectId, apiKey, branch.id)

  rewriteEnv(envPath, connectionString, {
    NEON_WORKSPACE_BRANCH: branchName,
    NEON_WORKSPACE_PARENT_BRANCH: parentBranch
  })
  console.log('Updated .env with workspace DATABASE_URL')

  const metadataDir = resolve(workspaceDir, '.context')
  const metadataPath = resolve(metadataDir, 'neon-workspace.json')
  mkdirSync(metadataDir, { recursive: true })
  writeFileSync(metadataPath, JSON.stringify({
    projectId,
    branchId: branch.id,
    branchName,
    parentBranch,
    workspaceName,
    createdAt: new Date().toISOString()
  }, null, 2))
  console.log(`Metadata saved to ${metadataPath}`)
}

async function archive() {
  const workspaceDir = process.cwd()
  const metadataPath = resolve(workspaceDir, '.context', 'neon-workspace.json')

  let projectId, apiKey, branchName, branchId

  const env = loadEnv(resolve(workspaceDir, '.env'))
  apiKey = env.NEON_API_KEY || process.env.NEON_API_KEY
  projectId = env.NEON_PROJECT_ID || process.env.NEON_PROJECT_ID

  if (existsSync(metadataPath)) {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))
    projectId = projectId || metadata.projectId
    branchId = metadata.branchId
    branchName = metadata.branchName
    console.log(`Loaded metadata: branch "${branchName}" (${branchId})`)
  } else {
    const workspaceName = process.env.CONDUCTOR_WORKSPACE_NAME || basename(workspaceDir)
    branchName = deriveBranchName(workspaceName)
    console.log(`No metadata found. Derived branch name: ${branchName}`)
  }

  if (!projectId || !apiKey) {
    console.error('ERROR: NEON_PROJECT_ID and NEON_API_KEY are required for archive.')
    process.exit(1)
  }

  if (!branchId) {
    const branch = await findBranchByName(projectId, apiKey, branchName)
    if (!branch) {
      console.log(`Branch "${branchName}" not found. Nothing to delete.`)
      return
    }
    branchId = branch.id
  }

  console.log(`Deleting branch ${branchName} (${branchId})...`)
  await deleteBranch(projectId, apiKey, branchId)
  console.log('Branch deleted.')
}

const command = process.argv[2]
if (command === 'setup') {
  setup().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
} else if (command === 'archive') {
  archive().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
} else {
  console.error('Usage: node neon-workspace-db.mjs <setup|archive>')
  process.exit(1)
}
