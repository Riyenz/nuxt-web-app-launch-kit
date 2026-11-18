import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { planE2eRun } from '../../scripts/ci/e2e-gate.mjs'
import { CORE_SPECS } from '../e2e/suites.mjs'

const specsOnDisk = readdirSync(new URL('../e2e/', import.meta.url))
  .filter(function isSpec(file) {
    return file.endsWith('.spec.ts')
  })
  .map(function toRepositoryPath(file) {
    return `tests/e2e/${file}`
  })

describe('the core E2E list', () => {
  it('only names specs that exist', () => {
    expect(CORE_SPECS.filter(function isMissing(spec) {
      return !specsOnDisk.includes(spec)
    })).toEqual([])
  })
})

describe('planE2eRun', () => {
  it('skips a diff that cannot change how the app behaves', () => {
    const plan = planE2eRun([
      'README.md',
      'docs/ci-cd.md',
      'app/assets/css/main.css',
      'tests/unit/e2e-gate.test.ts',
      'stories/Button.stories.ts',
      '.github/workflows/ci.yml',
      'scripts/shot.mjs'
    ])

    expect(plan.isRequired).toBe(false)
    expect(plan.specs).toEqual([])
    expect(plan.runtimeFiles).toEqual([])
  })

  it('runs the whole core list for one runtime change', () => {
    const plan = planE2eRun(['README.md', 'app/pages/app/dashboard.vue'])

    expect(plan.isRequired).toBe(true)
    expect(plan.specs).toEqual(CORE_SPECS)
    expect(plan.runtimeFiles).toEqual(['app/pages/app/dashboard.vue'])
  })

  it('runs the core list when the database, the build or the job itself changes', () => {
    for (const file of [
      'prisma/schema.prisma',
      'prisma/migrations/20261118000000_add_code/migration.sql',
      'prisma.config.ts',
      'nuxt.config.ts',
      'pnpm-lock.yaml',
      'server/api/users.get.ts',
      'scripts/migration-phases.mjs',
      'scripts/ci/deploy-migrate.mjs',
      'tests/e2e/helpers/auth.ts',
      'tests/e2e/login.spec.ts',
      '.github/workflows/e2e.yml'
    ]) {
      expect(planE2eRun([file]).isRequired, file).toBe(true)
    }
  })

  it('reads the paths git prints, however they arrive', () => {
    const plan = planE2eRun([' server\\api\\users.get.ts ', 'server/api/users.get.ts', ''])

    expect(plan.files).toEqual(['server/api/users.get.ts'])
    expect(plan.isRequired).toBe(true)
  })
})

describe('the e2e-gate command', () => {
  function runGate(files: string[]) {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-gate-test-'))
    const specList = join(dir, 'specs.txt')
    const githubOutput = join(dir, 'output.txt')

    execFileSync('node', ['scripts/ci/e2e-gate.mjs', '--files', ...files, '--spec-list', specList, '--github-output', githubOutput])

    return { specs: readFileSync(specList, 'utf8'), output: readFileSync(githubOutput, 'utf8') }
  }

  it('writes the spec list and the step outputs the workflow reads', () => {
    expect(runGate(['server/api/users.get.ts'])).toEqual({
      specs: `${CORE_SPECS.join('\n')}\n`,
      output: `is_required=true\nspec_count=${CORE_SPECS.length}\n`
    })
    expect(runGate(['docs/ci-cd.md'])).toEqual({
      specs: '',
      output: 'is_required=false\nspec_count=0\n'
    })
  })
})
