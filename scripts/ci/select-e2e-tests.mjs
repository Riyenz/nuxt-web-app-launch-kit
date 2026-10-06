import { execFileSync } from 'node:child_process'
import { appendFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Maps a pull request's diff to the E2E specs it can actually affect, so a PR that
// only touches one page doesn't pay for the whole suite. Three outcomes:
//
//   1. A file matches a RULE       -> run that rule's specs.
//   2. A file matches FULL_SUITE   -> run everything (it's shared infrastructure).
//   3. A runtime file matches       -> run everything. An unclassified runtime file is
//      neither a rule nor NO_E2E      assumed dangerous; that fallback is what makes it
//                                     safe to leave rules incomplete.
//
// Anything in NO_E2E_COVERAGE_PATTERNS is known to have no E2E signal and is skipped
// without triggering the fallback. Keep that list honest: a file listed there that
// really does affect a spec turns a red build green.

const ALL_SPECS = readdirSync(new URL('../../tests/e2e/', import.meta.url))
  .filter(function isSpec(file) {
    return file.endsWith('.spec.ts')
  })
  .map(function toRepositoryPath(file) {
    return `tests/e2e/${file}`
  })
  .sort()

// Every spec that renders inside the /app shell (sidebar, navbar, auth guard).
const APP_SPECS = [
  'tests/e2e/dashboard.spec.ts',
  'tests/e2e/users-api.spec.ts'
]

const AUTH_SPECS = [
  'tests/e2e/dashboard.spec.ts',
  'tests/e2e/login.spec.ts',
  'tests/e2e/users-api.spec.ts'
]

const RULES = [
  {
    name: 'dashboard page',
    patterns: [
      /^app\/pages\/app\/dashboard\.vue$/
    ],
    specs: ['tests/e2e/dashboard.spec.ts']
  },
  {
    name: 'landing page',
    patterns: [
      /^app\/pages\/index\.vue$/
    ],
    specs: ['tests/e2e/login.spec.ts']
  },
  {
    name: 'app shell',
    patterns: [
      /^app\/components\/App(Navbar|Sidebar)\.vue$/,
      /^app\/layouts\/app\.vue$/
    ],
    specs: APP_SPECS
  },
  {
    name: 'authentication',
    patterns: [
      /^app\/middleware\/auth\.ts$/,
      /^app\/layouts\/default\.vue$/
    ],
    specs: AUTH_SPECS
  },
  {
    name: 'users API',
    patterns: [
      /^server\/api\/users\.get\.ts$/
    ],
    specs: ['tests/e2e/users-api.spec.ts']
  }
]

// Shared infrastructure: a change here can move any spec, so don't try to be clever.
const FULL_SUITE_PATTERNS = [
  /^\.github\/workflows\/e2e\.yml$/,
  /^app\/app\.config\.ts$/,
  /^app\/app\.vue$/,
  /^app\/lib\/(db-adapter|prisma|prepared-statement-race)\.ts$/,
  /^generated\//,
  /^nuxt\.config\.ts$/,
  /^package\.json$/,
  /^playwright\.config\.ts$/,
  /^pnpm-lock\.yaml$/,
  /^prisma\/migrations\//,
  /^prisma\/schema\.prisma$/,
  /^prisma\/seed(-integrity)?\.ts$/,
  /^scripts\/ci\/(deploy-migrate|select-e2e-tests)\.mjs$/,
  /^server\/plugins\//,
  /^tests\/e2e\/auth\.setup\.ts$/,
  /^tests\/e2e\/global-setup\.ts$/,
  /^tests\/e2e\/helpers\//,
  /^tsconfig\.json$/,
  /^vitest\.config\.ts$/
]

// Known to carry no E2E signal. Specs assert on role/text/testid, never on computed
// styles, so a CSS-only diff proves nothing either way.
const NO_E2E_COVERAGE_PATTERNS = [
  /^\.claude\//,
  /^\.github\/(?!workflows\/e2e\.yml$)/,
  /^\.storybook\//,
  /^\.superset\//,
  /^app\/assets\/css\//,
  /^docs\//,
  /^public\//,
  /^scripts\/(?!ci\/)/,
  /^stories\//,
  /^tests\/unit\//,
  /(^|\/)(AGENTS|CLAUDE|README)\.md$/,
  /\.md$/
]

function isMatch(file, patterns) {
  return patterns.some(function testPattern(pattern) {
    return pattern.test(file)
  })
}

function isRuntimeFile(file) {
  return /^(app|generated|prisma|server)\//.test(file)
    || /^(nuxt|playwright|vitest)\.config\./.test(file)
    || /^(package\.json|pnpm-lock\.yaml|tsconfig\.json)$/.test(file)
}

export function selectE2eTests(changedFiles) {
  const files = [...new Set(changedFiles.map(function normalizeFile(file) {
    return file.trim().replaceAll('\\', '/')
  }).filter(Boolean))].sort()

  const directSpecs = files.filter(function isDirectSpec(file) {
    return ALL_SPECS.includes(file)
  })
  // A spec file that isn't on disk anymore (renamed or deleted in this PR) can't be
  // mapped, so fall back rather than silently dropping its coverage.
  const unknownSpecFiles = files.filter(function isUnknownSpec(file) {
    return /^tests\/e2e\/[^/]+\.spec\.ts$/.test(file) && !ALL_SPECS.includes(file)
  })

  const fullSuiteFiles = files.filter(function isFullSuiteFile(file) {
    return isMatch(file, FULL_SUITE_PATTERNS)
  })

  if (fullSuiteFiles.length > 0 || unknownSpecFiles.length > 0) {
    return {
      files,
      isFullSuite: true,
      matchedRules: ['full suite fallback'],
      skippedFiles: [],
      specs: [...ALL_SPECS],
      triggerFiles: [...fullSuiteFiles, ...unknownSpecFiles].sort(),
      unmatchedRuntimeFiles: []
    }
  }

  const specs = new Set(directSpecs)
  const matchedRules = []
  const mappedFiles = new Set(directSpecs)

  for (const rule of RULES) {
    const matches = files.filter(function matchesRule(file) {
      return isMatch(file, rule.patterns)
    })

    if (matches.length === 0) {
      continue
    }

    matchedRules.push(rule.name)
    matches.forEach(function addMappedFile(file) {
      mappedFiles.add(file)
    })
    rule.specs.forEach(function addSpec(spec) {
      specs.add(spec)
    })
  }

  const skippedFiles = files.filter(function isExplicitlySkipped(file) {
    return isMatch(file, NO_E2E_COVERAGE_PATTERNS)
  })

  const unmatchedRuntimeFiles = files.filter(function isUnmatchedRuntimeFile(file) {
    return isRuntimeFile(file)
      && !mappedFiles.has(file)
      && !skippedFiles.includes(file)
  })

  if (unmatchedRuntimeFiles.length > 0) {
    return {
      files,
      isFullSuite: true,
      matchedRules: [...matchedRules, 'unclassified runtime fallback'],
      skippedFiles,
      specs: [...ALL_SPECS],
      triggerFiles: unmatchedRuntimeFiles,
      unmatchedRuntimeFiles
    }
  }

  return {
    files,
    isFullSuite: false,
    matchedRules,
    skippedFiles,
    specs: [...specs].sort(),
    triggerFiles: [...mappedFiles].sort(),
    unmatchedRuntimeFiles: []
  }
}

function getOption(args, name) {
  const index = args.indexOf(name)
  if (index === -1) {
    return null
  }

  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`)
  }

  return value
}

function getChangedFiles(args) {
  const filesIndex = args.indexOf('--files')
  if (filesIndex !== -1) {
    const files = []

    for (let index = filesIndex + 1; index < args.length; index += 1) {
      const value = args[index]
      if (value.startsWith('--')) {
        break
      }
      files.push(value)
    }

    return files
  }

  const base = getOption(args, '--base')
  const head = getOption(args, '--head')

  if (!base || !head) {
    throw new Error('Use --base <sha> --head <sha> or --files <path...>')
  }

  return execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACDMRTUXB', `${base}...${head}`],
    { encoding: 'utf8' }
  ).split('\n').filter(Boolean)
}

function writeGithubOutput(outputPath, selection) {
  appendFileSync(
    outputPath,
    [
      `is_required=${selection.specs.length > 0}`,
      `is_full_suite=${selection.isFullSuite}`,
      `spec_count=${selection.specs.length}`,
      ''
    ].join('\n')
  )
}

function printSelection(selection) {
  console.log(`Changed files: ${selection.files.length}`)

  if (selection.specs.length === 0) {
    console.log('Selected E2E specs: none')
  } else {
    console.log(`Selected E2E specs (${selection.specs.length}):`)
    selection.specs.forEach(function printSpec(spec) {
      console.log(`- ${spec}`)
    })
  }

  if (selection.matchedRules.length > 0) {
    console.log(`Matched rules: ${selection.matchedRules.join(', ')}`)
  }

  if (selection.triggerFiles.length > 0) {
    console.log('Trigger files:')
    selection.triggerFiles.forEach(function printTriggerFile(file) {
      console.log(`- ${file}`)
    })
  }

  if (selection.skippedFiles.length > 0) {
    console.log('Files with no current E2E coverage:')
    selection.skippedFiles.forEach(function printSkippedFile(file) {
      console.log(`- ${file}`)
    })
  }
}

function run() {
  const args = process.argv.slice(2)
  const selection = selectE2eTests(getChangedFiles(args))
  const specListPath = getOption(args, '--spec-list')
  const githubOutputPath = getOption(args, '--github-output')

  if (specListPath) {
    writeFileSync(specListPath, `${selection.specs.join('\n')}${selection.specs.length > 0 ? '\n' : ''}`)
  }

  if (githubOutputPath) {
    writeGithubOutput(githubOutputPath, selection)
  }

  printSelection(selection)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  run()
}
