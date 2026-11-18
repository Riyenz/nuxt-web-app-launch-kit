import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'

import { deletePreviewBranch, releasePreviewBranch } from '../../scripts/ci/preview-branch.mjs'

const REPO = 'acme/launch-app'
const PROJECT_ID = 'autumn-grass-73913234'

const workflow = parse(readFileSync(new URL('../../.github/workflows/preview-db.yml', import.meta.url), 'utf8'))
const job = workflow.jobs['release-slot']
const step = job.steps.find(function byName(candidate: { name: string }) {
  return candidate.name === 'Delete the preview database'
})

// GitHub reads a missing property as null; plain JS throws on the same path, so every `github`
// path becomes an optional chain before the expression runs.
function evaluate(expression: string, github: unknown) {
  const body = expression
    .replace(/\$\{\{|\}\}/g, '')
    .replace(/\bgithub((?:\.[\w-]+)+)/g, function optional(_match: string, path: string) {
      return `github?.${path.slice(1).split('.').join('?.')}`
    })

  return new Function('github', `return (${body})`)(github)
}

function interpolate(template: string, github: unknown) {
  return template.replace(/\$\{\{(.+?)\}\}/g, function fill(_match: string, expression: string) {
    return String(evaluate(expression, github))
  })
}

function branchDeleted(ref: string, refType = 'branch') {
  return { event_name: 'delete', repository: REPO, event: { ref, ref_type: refType } }
}

function pullRequestClosed(ref: string, headRepo = REPO) {
  return {
    event_name: 'pull_request',
    repository: REPO,
    event: { pull_request: { head: { ref, repo: { full_name: headRepo } } } }
  }
}

function stubNeon(branches: { id: string, name: string }[]) {
  const calls: string[] = []

  vi.stubGlobal('fetch', async function neon(url: string, options: { method?: string } = {}) {
    calls.push(`${options.method ?? 'GET'} ${new URL(url).pathname}`)

    return {
      ok: true,
      status: 200,
      async json() {
        return { branches }
      },
      async text() {
        return ''
      }
    }
  })

  return calls
}

describe('preview database cleanup triggers', () => {
  it('fires when a git branch is deleted on GitHub, with that branch as the database name', () => {
    const github = branchDeleted('feat/796-staff-payslips')

    expect(workflow.on.delete).toBeNull()
    expect(evaluate(job.if, github)).toBe(true)
    expect(interpolate(step.env.GIT_BRANCH, github)).toBe('feat/796-staff-payslips')
  })

  it('keeps the closed pull request trigger', () => {
    const github = pullRequestClosed('fix/642-payslip-row')

    expect(workflow.on.pull_request.types).toEqual(['closed'])
    expect(evaluate(job.if, github)).toBe(true)
    expect(interpolate(step.env.GIT_BRANCH, github)).toBe('fix/642-payslip-row')
  })

  it('ignores a deleted tag and a pull request from a fork', () => {
    expect(evaluate(job.if, branchDeleted('v1.0.1', 'tag'))).toBe(false)
    expect(evaluate(job.if, pullRequestClosed('feat/outside', 'someone/launch-app'))).toBe(false)
  })

  it('queues the two triggers for one branch instead of racing them', () => {
    const group = workflow.concurrency.group

    expect(interpolate(group, branchDeleted('feat/668-13th-month')))
      .toBe(interpolate(group, pullRequestClosed('feat/668-13th-month')))
    expect(workflow.concurrency['cancel-in-progress']).toBe(false)
  })

  it('runs the one helper both triggers share', () => {
    expect(step.run).toContain('releasePreviewBranch')
    expect(step.run).toContain('process.env.GIT_BRANCH')
  })
})

describe('releasePreviewBranch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deletes the database named after the branch and nothing else', async () => {
    const calls = stubNeon([
      { id: 'br-1', name: 'development' },
      { id: 'br-2', name: 'chore/698-ios-1-0-1' },
      { id: 'br-3', name: 'feat/796-staff-payslips' }
    ])

    const message = await releasePreviewBranch(PROJECT_ID, 'key', 'chore/698-ios-1-0-1')

    expect(message).toBe('Deleted preview database "chore/698-ios-1-0-1"')
    expect(calls).toEqual([
      `GET /api/v2/projects/${PROJECT_ID}/branches`,
      `DELETE /api/v2/projects/${PROJECT_ID}/branches/br-2`
    ])
  })

  it('says so and deletes nothing when the branch has no database', async () => {
    const calls = stubNeon([{ id: 'br-1', name: 'development' }])

    expect(await releasePreviewBranch(PROJECT_ID, 'key', 'fix/819-delete-db-with-branch'))
      .toBe('No preview database to delete')
    expect(calls).toEqual([`GET /api/v2/projects/${PROJECT_ID}/branches`])
  })

  it('never touches a permanent or reserved database, and reaches Neon not at all', async () => {
    const calls = stubNeon([])

    for (const reserved of ['production', 'development', 'sw-0n7cj99d', 'local-dev']) {
      expect(await releasePreviewBranch(PROJECT_ID, 'key', reserved))
        .toBe(`"${reserved}" is a permanent or reserved database name: nothing deleted`)
    }

    expect(calls).toEqual([])
  })

  it('still refuses a reserved name at the delete call itself', async () => {
    stubNeon([{ id: 'br-1', name: 'production' }])

    await expect(deletePreviewBranch(PROJECT_ID, 'key', 'production')).rejects.toThrow(
      'Refusing to delete "production": that name is permanent or reserved'
    )
  })
})
