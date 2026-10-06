// Lighthouse runs on the release pull request only, against the Nitro build the `build`
// step just produced. Nothing here is prerendered (`routeRules` keeps `/` server-rendered),
// so the audit needs the real server rather than a static `.output/public`.
//
// Only SEO is asserted. Performance, accessibility and best-practices are collected and
// uploaded, but a number that moves with the runner's load should not fail a merge.
module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      startServerCommand: 'PORT=4173 node .output/server/index.mjs',
      startServerReadyPattern: 'Listening',
      numberOfRuns: 1
    },
    assert: {
      assertions: {
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:performance': 'off',
        'categories:accessibility': 'off',
        'categories:best-practices': 'off'
      }
    },
    upload: {
      // Publishes the report to Google's temporary public storage and prints the link in
      // the job log. Swap for `filesystem` if a public report is not acceptable.
      target: 'temporary-public-storage'
    }
  }
}
