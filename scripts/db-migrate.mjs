import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { findUnsafeChanges } from './ci/check-migrations.mjs'
import {
  classifyUnit,
  CONTRACT_SUFFIX,
  findRemovedValues,
  findSwapTables,
  groupUnits,
  hasRef,
  isBackfillOf,
  isContractMigration,
  isRequiredWithoutDefault,
  isUpdate,
  listMigrations,
  listNewMigrations,
  liveColumn,
  MIGRATIONS_DIR,
  movesEnumValue,
  parseMigration,
  readRelease,
  readSchemaAt,
  SCHEMA_PATH
} from './migration-phases.mjs'

// Writes a schema change as an expand migration plus, when it removes anything, a contract
// migration that production applies one release later. See docs/prisma-workflow.md.
//
//   pnpm db:migrate <name>                               create, split and apply
//   pnpm db:migrate --split prisma/migrations/<folder>   split a migration that already exists

const BASE_REF = 'origin/master'
const CONTRACT_HEADER = [
  '-- Contract migration. Production applies it in the first deploy after a release that contains',
  '-- it is live, so the release still serving never loses a column, table or value it reads.'
].join('\n')

function renderAlterTable(table, actions) {
  const texts = actions.map(function toText(action) {
    return action.text
  })
  return `-- AlterTable\nALTER TABLE "${table}" ${texts.join(',\n')};`
}

// Prisma writes no backfill. Making a column required or removing an enum value needs one in the
// expand migration, so the new release never reads an old row, and again in the contract for rows
// the old release saved in between. The split leaves a TODO in each place, and the check fails
// until a real UPDATE replaces it.
function fillTodos(table, column) {
  return {
    expand: `-- TODO: fill the empty rows of "${table}"."${column}" before the new release reads them, for example:\n-- UPDATE "${table}" SET "${column}" = <value> WHERE "${column}" IS NULL;`,
    contract: `-- TODO: repeat the expand migration's UPDATE that fills "${table}"."${column}" here, for rows saved in between.`
  }
}

function moveTodos(table, value) {
  return {
    expand: `-- TODO: move the "${table}" rows that hold ${value} before the new release reads them, for example:\n-- UPDATE "${table}" SET <column> = <other value> WHERE <column> = '${value}';`,
    contract: `-- TODO: repeat the expand migration's UPDATE that moves the "${table}" rows holding ${value} here, for rows saved in between.`
  }
}

function withTodos(text, todos) {
  return [...todos, text].join('\n')
}

/// Sorts a migration's statements into expand and contract with the classifier the check uses,
/// then runs the check on the result. `context` holds the schema in production
/// (`liveSchemaText`), the schema after this change (`branchSchemaText`) and the other
/// migrations production does not have yet.
export function splitMigration(migration, context) {
  const { liveSchemaText, branchSchemaText = liveSchemaText, otherMigrations = [] } = context
  const { statements } = parseMigration(migration)
  const release = readRelease(liveSchemaText, [...otherMigrations.map(parseMigration), { ...migration, statements }])
  const updates = statements
    .filter(function isBackfill(statement) {
      return isUpdate(statement.text)
    })
    .map(function toText(statement) {
      return statement.text
    })
  const expand = []
  const expandTodos = []
  const contract = []
  const blocked = []
  const loosened = []

  for (const unit of groupUnits(statements)) {
    const result = classifyUnit(unit, release)
    const raw = unit.map(function toRaw(statement) {
      return statement.raw
    }).join('\n')

    if (result.isMarked || result.phase === 'expand') {
      expand.push(raw)
      continue
    }

    if (result.phase === 'blocked') {
      for (const reason of result.reasons) {
        if (reason.phase === 'blocked') {
          blocked.push({ line: unit[0].line, reason: reason.text })
        }
      }
      continue
    }

    if (result.enumSwap) {
      const todos = []
      for (const value of findRemovedValues(release.live.enums, result.enumSwap)) {
        for (const table of findSwapTables(unit)) {
          const todo = moveTodos(table, value)
          todos.push(todo.contract)
          if (!updates.some(function moves(text) {
            return movesEnumValue(text, table, value)
          })) {
            expandTodos.push(todo.expand)
          }
        }
      }
      contract.push(withTodos(raw, todos))
      continue
    }

    const [statement] = result.results
    if (unit.length > 1 || statement.actions.length === 0) {
      contract.push(raw)
      continue
    }

    const expandActions = statement.actions.filter(function isExpand(action) {
      return action.phase === 'expand'
    })
    const contractActions = statement.actions.filter(function isContract(action) {
      return action.phase === 'contract'
    })
    const contractText = expandActions.length > 0 ? renderAlterTable(statement.table, contractActions) : raw

    if (expandActions.length > 0) {
      expand.push(renderAlterTable(statement.table, expandActions))
    }
    const todos = []
    for (const action of contractActions) {
      if (action.kind === 'drop-column' && isRequiredWithoutDefault(liveColumn(release.live, statement.table, action.column))) {
        loosened.push(`ALTER TABLE "${statement.table}" ALTER COLUMN "${action.column}" DROP NOT NULL;`)
      }
      if (action.kind === 'set-not-null') {
        const todo = fillTodos(statement.table, action.column)
        todos.push(todo.contract)
        if (!updates.some(function fills(text) {
          return isBackfillOf(text, statement.table, action.column)
        })) {
          expandTodos.push(todo.expand)
        }
      }
    }
    contract.push(withTodos(contractText, todos))
  }

  expand.push(...expandTodos)

  if (loosened.length > 0) {
    expand.push(['-- The new release leaves these columns empty until the contract migration drops them.', ...loosened].join('\n'))
  }

  const expandSql = expand.length > 0 ? `${expand.join('\n\n')}\n` : ''
  const contractSql = contract.length > 0 ? `${CONTRACT_HEADER}\n\n${contract.join('\n\n')}\n` : ''
  const contractName = `${migration.name}${CONTRACT_SUFFIX}`
  const parts = [{ name: migration.name, sql: expandSql }, { name: contractName, sql: contractSql }].filter(function isWritten(part) {
    return part.sql
  })
  const problems = blocked.length > 0 || !contractSql
    ? []
    : findUnsafeChanges(liveSchemaText, [...otherMigrations, ...parts], branchSchemaText).filter(function isOwn(problem) {
        return problem.migration === migration.name || problem.migration === contractName
      })

  return { expandSql, contractSql, blocked, problems }
}

export function nextTimestamp(timestamp) {
  const [, year, month, day, hour, minute, second] = timestamp.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/).map(Number)
  const next = new Date(Date.UTC(year, month - 1, day, hour, minute, second + 1))
  return next.toISOString().replace(/\D/g, '').slice(0, 14)
}

function splitFolder(folder) {
  const name = basename(folder)

  if (isContractMigration(name)) {
    return { blocked: [], problems: [], contractFolder: null }
  }

  if (!hasRef(BASE_REF)) {
    console.error(`✗ ${BASE_REF} not found. Run: git fetch origin master`)
    process.exit(1)
  }

  const result = splitMigration({ name, sql: readFileSync(join(folder, 'migration.sql'), 'utf-8') }, {
    liveSchemaText: readSchemaAt(BASE_REF),
    branchSchemaText: readFileSync(SCHEMA_PATH, 'utf-8'),
    otherMigrations: listNewMigrations(BASE_REF).filter(function isOther(migration) {
      return migration.name !== name
    })
  })

  if (result.blocked.length > 0 || !result.contractSql) {
    return { ...result, contractFolder: null }
  }

  const contractFolder = result.expandSql
    ? join(dirname(folder), `${nextTimestamp(name.slice(0, 14))}_${name.slice(15)}${CONTRACT_SUFFIX}`)
    : join(dirname(folder), `${name}${CONTRACT_SUFFIX}`)

  if (result.expandSql) {
    writeFileSync(join(folder, 'migration.sql'), result.expandSql)
  } else {
    renameSync(folder, contractFolder)
  }

  mkdirSync(contractFolder, { recursive: true })
  writeFileSync(join(contractFolder, 'migration.sql'), result.contractSql)

  // The check ran on the split under a placeholder contract name; name the folder on disk instead.
  const problems = result.problems.map(function toFolder(problem) {
    return problem.migration === `${name}${CONTRACT_SUFFIX}` ? { ...problem, migration: basename(contractFolder) } : problem
  })
  return { ...result, problems, expandFolder: result.expandSql ? folder : null, contractFolder }
}

/// Prints what the split made. Answers false when the files still need a hand edit.
function report(folder, result) {
  for (const problem of result.blocked) {
    console.error(`✗ ${folder}/migration.sql:${problem.line}  ${problem.reason}`)
  }

  if (!result.contractFolder) {
    return result.blocked.length === 0
  }

  if (result.expandFolder) {
    console.log(`✓ expand:   ${result.expandFolder} (applied before the new release goes live)`)
  }
  console.log(`✓ contract: ${result.contractFolder} (applied one release later)`)

  for (const problem of result.problems) {
    console.error(`✗ ${join(dirname(folder), problem.migration, 'migration.sql')}:${problem.line}  ${problem.message}`)
  }
  return result.problems.length === 0
}

function prisma(args) {
  const result = spawnSync('prisma', args, { stdio: 'inherit', env: process.env })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function run() {
  const args = process.argv.slice(2)

  if (args[0] === '--split') {
    const folder = args[1]?.replace(/\/$/, '')
    if (!folder || !existsSync(join(folder, 'migration.sql'))) {
      console.error('Usage: pnpm db:migrate --split prisma/migrations/<folder>')
      process.exit(1)
    }

    const result = splitFolder(folder)
    if (!report(folder, result)) {
      if (result.contractFolder) {
        console.error('\nEdit the migration files above, then apply them: pnpm exec prisma migrate dev')
      }
      process.exit(1)
    }
    if (!result.contractFolder) {
      console.log(`✓ ${folder} removes nothing production reads; nothing to split`)
      return
    }
    console.log('If your local database already applied the old file, reset it: pnpm exec prisma migrate reset')
    return
  }

  const name = args[0]
  if (!name || name.startsWith('-')) {
    console.error('Usage: pnpm db:migrate <name>   or   pnpm db:migrate --split prisma/migrations/<folder>')
    process.exit(1)
  }

  const before = new Set(listMigrations())
  prisma(['migrate', 'dev', '--create-only', '--name', name])
  const created = listMigrations().filter(function isCreated(folder) {
    return !before.has(folder)
  })

  for (const folderName of created) {
    const folder = join(MIGRATIONS_DIR, folderName)
    const result = splitFolder(folder)

    if (result.blocked.length > 0) {
      report(folder, result)
      rmSync(folder, { recursive: true, force: true })
      console.error(`\nDeleted ${folder}. Change schema.prisma as above, then run pnpm db:migrate ${name} again.`)
      process.exit(1)
    }

    if (!report(folder, result)) {
      console.error('\nEdit the migration files above, then apply them: pnpm exec prisma migrate dev')
      process.exit(1)
    }
  }

  prisma(['migrate', 'dev'])
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  run()
}
