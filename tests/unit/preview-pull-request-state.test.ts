import { describe, expect, it, vi } from 'vitest'

import { getPullRequestState } from '../../scripts/ci/pull-request-state.mjs'

// HEAD_SHA is the commit the pull request ended on, EARLIER_SHA a push before it.

const GIT_REF = 'feat/late-build'
const HEAD_SHA = 'b31b1c6eeb2c9f98a186589fc0ab5bbc79c3c3f1'
const EARLIER_SHA = 'a1a1a1a1b2b2b2b2c3c3c3c3d4d4d4d4e5e5e5e5'
const LATER_SHA = 'd4d4c0ffee2b7a1f9e3c5a6d8b0f2e4c6a8d0b2e'

function options(overrides: Record<string, unknown> = {}) {
  return { commitSha: HEAD_SHA, gitRef: GIT_REF, owner: 'acme', repo: 'launch-app', token: 'github_pat_test', ...overrides }
}

function pullRequest(number: number, state: string, mergedAt: string | null) {
  return { number, state, merged_at: mergedAt }
}

function body(value: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => value }
}

// GitHub answers two questions here: the pull requests of the branch, then the commits of a
// finished one. `commits` maps a pull request number to the shas it carried.
function answerWith(pullRequests: unknown, commits: Record<number, string[]> = {}, commitsStatus = 200) {
  return vi.fn(async function respond(url: string) {
    const asked = url.match(/\/pulls\/(\d+)\/commits/)

    if (!asked) {
      return body(pullRequests)
    }

    const shas = commits[Number(asked[1])] ?? []

    return body(shas.map(sha => ({ sha })), commitsStatus)
  })
}

describe('a finished pull request', () => {
  it('reports the merged pull request that carried this commit', async () => {
    const fetchImpl = answerWith([pullRequest(750, 'closed', '2026-11-05T18:22:01Z')], { 750: [EARLIER_SHA, HEAD_SHA] })

    expect(await getPullRequestState(options({ fetchImpl }))).toEqual({
      isFinished: true,
      reason: 'pull request #750 is merged'
    })
  })

  // The cleanup workflow deletes the database on close as well as on merge, so a build queued
  // past a closed pull request has the same leak to avoid.
  it('reports a pull request closed without merging', async () => {
    const fetchImpl = answerWith([pullRequest(716, 'closed', null)], { 716: [HEAD_SHA] })

    expect(await getPullRequestState(options({ fetchImpl }))).toEqual({
      isFinished: true,
      reason: 'pull request #716 is closed'
    })
  })

  // Two pushes queue two builds, the second overtakes the first, and the merge lands before the
  // first one runs. That build is as late as any other and must create nothing.
  it('reports a commit that a newer push overtook', async () => {
    const fetchImpl = answerWith([pullRequest(750, 'closed', '2026-11-05T18:22:01Z')], { 750: [EARLIER_SHA, HEAD_SHA] })
    const state = await getPullRequestState(options({ fetchImpl, commitSha: EARLIER_SHA }))

    expect(state).toEqual({ isFinished: true, reason: 'pull request #750 is merged' })
  })

  it('reads the newest pull request first when a branch name came round again', async () => {
    const fetchImpl = answerWith(
      [pullRequest(700, 'closed', '2026-10-01T00:00:00Z'), pullRequest(800, 'closed', null)],
      { 700: [HEAD_SHA], 800: [HEAD_SHA] }
    )

    expect(await getPullRequestState(options({ fetchImpl }))).toEqual({
      isFinished: true,
      reason: 'pull request #800 is closed'
    })
  })
})

describe('a build that keeps its database', () => {
  it('keeps building while the pull request is open, and asks for no commits', async () => {
    const fetchImpl = answerWith([pullRequest(750, 'open', null)])
    const state = await getPullRequestState(options({ fetchImpl }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toBe('pull request #750 is open')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('keeps building when the branch was reused for a second, open pull request', async () => {
    const fetchImpl = answerWith([pullRequest(750, 'closed', '2026-11-05T18:22:01Z'), pullRequest(812, 'open', null)])
    const state = await getPullRequestState(options({ fetchImpl }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toBe('pull request #812 is open')
  })

  // The author closes #716 to rework it, pushes a fix, and reopens. The closed pull request
  // never carried this commit, so the build is new work and keeps its database.
  it('keeps building a commit pushed after the pull request closed', async () => {
    const fetchImpl = answerWith([pullRequest(716, 'closed', null)], { 716: [EARLIER_SHA, HEAD_SHA] })
    const state = await getPullRequestState(options({ fetchImpl, commitSha: LATER_SHA }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toBe('pull request #716 is closed, but never carried this commit')
  })

  it('keeps building when the branch has no pull request yet', async () => {
    const fetchImpl = answerWith([])
    const state = await getPullRequestState(options({ fetchImpl }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toBe('no pull request for this branch yet')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('the check never fails a build', () => {
  it('asks nothing and keeps building with no token', async () => {
    const fetchImpl = answerWith([pullRequest(750, 'closed', '2026-11-05T18:22:01Z')], { 750: [HEAD_SHA] })
    const state = await getPullRequestState(options({ fetchImpl, token: '' }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toContain('GITHUB_PREVIEW_TOKEN')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('keeps building when Vercel exposes no commit or repository name', async () => {
    const fetchImpl = answerWith([])
    const state = await getPullRequestState(options({ fetchImpl, commitSha: undefined, owner: undefined }))

    expect(state.isFinished).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('keeps building when GitHub refuses the pull request list', async () => {
    const fetchImpl = vi.fn(async function respond() {
      return body({ message: 'Bad credentials' }, 401)
    })
    const state = await getPullRequestState(options({ fetchImpl }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toContain('401')
  })

  // The second question failing must never read as "finished": that would take the database
  // away from a branch that is still being worked on.
  it('keeps building when GitHub refuses the commit list', async () => {
    const fetchImpl = answerWith([pullRequest(750, 'closed', '2026-11-05T18:22:01Z')], { 750: [HEAD_SHA] }, 500)
    const state = await getPullRequestState(options({ fetchImpl }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toContain('500')
  })

  it('keeps building when the request fails or times out', async () => {
    const fetchImpl = vi.fn(async function fail() {
      throw new Error('The operation was aborted due to timeout')
    })
    const state = await getPullRequestState(options({ fetchImpl }))

    expect(state.isFinished).toBe(false)
    expect(state.reason).toContain('timeout')
  })

  it('keeps building when the answer is not a list at all', async () => {
    const state = await getPullRequestState(options({ fetchImpl: answerWith({ message: 'Moved' }) }))

    expect(state.isFinished).toBe(false)
  })
})

describe('the requests it sends', () => {
  it('asks for the pull requests of this branch, slashes and all, then their commits', async () => {
    const fetchImpl = answerWith([pullRequest(750, 'closed', '2026-11-05T18:22:01Z')], { 750: [HEAD_SHA] })
    await getPullRequestState(options({ fetchImpl }))

    const [listUrl, listInit] = fetchImpl.mock.calls[0] as unknown as [string, { headers: Record<string, string> }]

    expect(listUrl.startsWith('https://api.github.com/repos/acme/launch-app/pulls?')).toBe(true)
    expect(new URL(listUrl).searchParams.get('head')).toBe(`acme:${GIT_REF}`)
    expect(new URL(listUrl).searchParams.get('state')).toBe('all')
    expect(listInit.headers.Authorization).toBe('Bearer github_pat_test')
    expect(fetchImpl.mock.calls[1]?.[0]).toBe('https://api.github.com/repos/acme/launch-app/pulls/750/commits?per_page=100')
  })
})
