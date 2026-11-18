import { execFileSync } from 'node:child_process'
import { appendFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { CORE_SPECS, NO_E2E_PATTERNS, RUNTIME_PATTERNS } from '../../tests/e2e/suites.mjs'

// The release pull request runs the core list and nothing else. This gate only answers whether
// the pull request can change how the app behaves. When it cannot, the job stops here: no build,
// no seed, no browser download. A per-spec selector guesses, and a wrong guess lets a regression
// through, so a change runs the whole core list or none of it.

function isMatch(file, patterns) {
  return patterns.some(function testPattern(pattern) {
    return pattern.test(file)
  })
}

export function planE2eRun(changedFiles) {
  const files = [...new Set(changedFiles.map(function normalizeFile(file) {
    return file.trim().replaceAll('\\', '/')
  }).filter(Boolean))].sort()

  const runtimeFiles = files.filter(function isRuntimeFile(file) {
    return isMatch(file, RUNTIME_PATTERNS) && !isMatch(file, NO_E2E_PATTERNS)
  })
  const isRequired = runtimeFiles.length > 0

  return {
    files,
    isRequired,
    runtimeFiles,
    specs: isRequired ? [...CORE_SPECS] : []
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

function printPlan(plan) {
  console.log(`Changed files: ${plan.files.length}`)

  if (!plan.isRequired) {
    console.log('No runtime file changed: the core E2E list is skipped.')
    return
  }

  console.log(`Core E2E specs (${plan.specs.length}):`)
  plan.specs.forEach(function printSpec(spec) {
    console.log(`- ${spec}`)
  })
  console.log('Runtime files that require the run:')
  plan.runtimeFiles.forEach(function printRuntimeFile(file) {
    console.log(`- ${file}`)
  })
}

function run() {
  const args = process.argv.slice(2)
  const plan = planE2eRun(getChangedFiles(args))
  const specListPath = getOption(args, '--spec-list')
  const githubOutputPath = getOption(args, '--github-output')

  if (specListPath) {
    writeFileSync(specListPath, `${plan.specs.join('\n')}${plan.specs.length > 0 ? '\n' : ''}`)
  }

  if (githubOutputPath) {
    appendFileSync(
      githubOutputPath,
      [`is_required=${plan.isRequired}`, `spec_count=${plan.specs.length}`, ''].join('\n')
    )
  }

  printPlan(plan)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  run()
}
