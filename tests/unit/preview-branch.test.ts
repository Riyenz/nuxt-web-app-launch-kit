import { afterEach, describe, expect, it, vi } from 'vitest'
import { deletePreviewBranch, isPreviewBranchName, resolvePreviewBranch } from '../../scripts/ci/preview-branch.mjs'

afterEach(() => {
  vi.unstubAllGlobals()
})

function branchesResponse(branches: { id: string, name: string }[]) {
  return new Response(JSON.stringify({ branches }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('isPreviewBranchName', () => {
  it('rejects permanent and reserved names', () => {
    expect(isPreviewBranchName('production')).toBe(false)
    expect(isPreviewBranchName('development')).toBe(false)
    expect(isPreviewBranchName('sw-workspace')).toBe(false)
    expect(isPreviewBranchName('local-ivan')).toBe(false)
  })

  it('accepts a feature branch, slash included', () => {
    expect(isPreviewBranchName('feat/manager-role')).toBe(true)
  })
})

describe('resolvePreviewBranch', () => {
  it('refuses a reserved name before calling Neon', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(resolvePreviewBranch('project', 'key', 'development', 'development'))
      .rejects.toThrow(/Refusing to use "development"/)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reuses a branch named after the git ref', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => branchesResponse([
      { id: 'parent', name: 'development' },
      { id: 'preview', name: 'feat/manager-role' }
    ])))

    const result = await resolvePreviewBranch('project', 'key', 'feat/manager-role', 'development')

    expect(result).toEqual({
      branch: { id: 'preview', name: 'feat/manager-role' },
      isCreated: false
    })
  })

  it('fails when every branch slot is taken and deletes nothing', async () => {
    const branches = [
      { id: 'production', name: 'production' },
      { id: 'development', name: 'development' },
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `preview-${index}`,
        name: `feat/slot-${index}`
      }))
    ]
    const fetchMock = vi.fn(async () => branchesResponse(branches))
    vi.stubGlobal('fetch', fetchMock)

    await expect(resolvePreviewBranch('project', 'key', 'feat/new', 'development'))
      .rejects.toThrow(/Neon has no free branch slot/)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates a branch forked from the parent when a slot is free', async () => {
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(String(options.body))
        return new Response(JSON.stringify({
          branch: { id: 'created', name: body.branch.name }
        }), { status: 200 })
      }

      return branchesResponse([
        { id: 'parent', name: 'development' },
        { id: 'production', name: 'production' }
      ])
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolvePreviewBranch('project', 'key', 'feat/new', 'development')

    expect(result.isCreated).toBe(true)
    expect(result.branch).toEqual({ id: 'created', name: 'feat/new' })
  })
})

describe('deletePreviewBranch', () => {
  it('refuses to delete a reserved name', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(deletePreviewBranch('project', 'key', 'local-ivan'))
      .rejects.toThrow(/Refusing to delete/)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when the preview branch is already gone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => branchesResponse([
      { id: 'parent', name: 'development' }
    ])))

    await expect(deletePreviewBranch('project', 'key', 'feat/gone')).resolves.toBeNull()
  })
})
