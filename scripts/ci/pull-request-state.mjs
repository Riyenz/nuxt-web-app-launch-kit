// Asks GitHub whether a preview build is a late build: one whose pull request already merged or
// closed. Vercel can queue a build for longer than its pull request stays open, and by the time it
// runs preview-db.yml has deleted the Neon branch. The build would make it again, nothing deletes
// a second copy, and it would hold a preview slot for good.
//
// Two questions, so up to two requests. The pull requests of the branch: an open one anywhere
// means the preview is still wanted. Then the commits of each finished one: a pull request
// speaks only for the commits it carried, so a push made after the close is new work and keeps
// its database. Most builds stop at the first request, because their pull request is open.
//
// `/commits/{sha}/pulls` would answer both in one request, but it returns nothing for a pull
// request closed without merging, and a squash-merged branch's commits never reach the default
// branch either.
//
// Every uncertainty answers "not finished" and leaves the build as it was. This check must never
// fail a build.

const GITHUB_API = 'https://api.github.com'
const TIMEOUT_MS = 10_000

function keepBuilding(reason) {
  return { isFinished: false, reason }
}

function describeState(pullRequest) {
  return pullRequest.merged_at ? 'merged' : 'closed'
}

async function fetchList(url, { token, fetchImpl, timeoutMs }) {
  const response = await fetchImpl(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status}`)
  }

  const body = await response.json()

  if (!Array.isArray(body)) {
    throw new Error('GitHub answered something this check cannot read')
  }

  return body
}

function fetchPullRequests({ gitRef, owner, repo, ...request }) {
  // `head` takes `owner:branch`, so a pull request from a fork matches nothing here and its
  // build keeps today's behaviour. Only same-repo branches are cleaned up anyway.
  const query = new URLSearchParams({ head: `${owner}:${gitRef}`, state: 'all', per_page: '100' })

  return fetchList(`${GITHUB_API}/repos/${owner}/${repo}/pulls?${query}`, request)
}

// Only the first 100 commits. A commit missed on a later page reads as "not in this pull
// request", which keeps the database — the safe way round.
async function isCommitInPullRequest(number, { commitSha, owner, repo, ...request }) {
  const commits = await fetchList(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}/commits?per_page=100`, request)

  return commits.some(function isThisCommit(commit) {
    return commit.sha === commitSha
  })
}

export async function getPullRequestState(options) {
  const { commitSha, gitRef, owner, repo, token, fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = options

  if (!token) {
    return keepBuilding('no GITHUB_PREVIEW_TOKEN, so the pull request was not checked')
  }

  if (!commitSha || !gitRef || !owner || !repo) {
    return keepBuilding('no commit, branch or repository name, so the pull request was not checked')
  }

  const request = { commitSha, owner, repo, token, fetchImpl, timeoutMs }

  try {
    // Newest first: a branch name that came round again carries its newest pull request.
    const pullRequests = (await fetchPullRequests({ gitRef, ...request })).sort(function byNewestFirst(one, other) {
      return other.number - one.number
    })

    if (pullRequests.length === 0) {
      return keepBuilding('no pull request for this branch yet')
    }

    const open = pullRequests.find(function isOpen(pullRequest) {
      return pullRequest.state === 'open'
    })

    if (open) {
      return keepBuilding(`pull request #${open.number} is open`)
    }

    for (const pullRequest of pullRequests) {
      if (await isCommitInPullRequest(pullRequest.number, request)) {
        return { isFinished: true, reason: `pull request #${pullRequest.number} is ${describeState(pullRequest)}` }
      }
    }

    return keepBuilding(`pull request #${pullRequests[0].number} is ${describeState(pullRequests[0])}, but never carried this commit`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // The only signal a person gets. When the token expires, every build lands here and creates
    // its database as before, so the leak comes back quietly.
    return keepBuilding(`could not ask GitHub (${message}); if this repeats, check GITHUB_PREVIEW_TOKEN in Vercel`)
  }
}
