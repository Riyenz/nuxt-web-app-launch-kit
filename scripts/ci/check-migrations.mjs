import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  classifyUnit,
  findRemovedValues,
  findSwapTables,
  groupUnits,
  hasRef,
  isBackfillOf,
  isContractMigration,
  isLiveTable,
  isRequiredWithoutDefault,
  isUpdate,
  listNewMigrations,
  liveColumn,
  MIGRATIONS_DIR,
  movesEnumValue,
  parseMigration,
  parseSchema,
  readRelease,
  readSchemaAt,
  SCHEMA_PATH
} from '../migration-phases.mjs'

// Checks every migration the base ref (production) does not have yet. An expand migration must
// keep the release in production working; a contract migration must only remove what the new
// release no longer reads. See docs/prisma-workflow.md, "Expand and contract".

const MOVE_HINT = 'A contract migration runs one release later, so move this to the expand migration.'

function checkExpandUnit(result, splitHint) {
  return result.reasons.map(function toMessage(reason) {
    return reason.phase === 'contract' ? `${reason.text} ${splitHint}` : reason.text
  })
}

function checkEnumSwap(unit, enumSwap, context) {
  const { release, branch, seenUpdates } = context
  const problems = []
  const stillUsed = findRemovedValues(branch.enums, enumSwap)

  if (stillUsed.length > 0) {
    problems.push(`removes ${stillUsed.join(', ')} from enum "${enumSwap.name}", but schema.prisma still has it, so this release can still send it.`)
  }

  // The new release cannot read a row that holds a value its enum lacks, so every table's rows
  // move in the expand migration, and again here for rows saved in between.
  for (const value of findRemovedValues(release.live.enums, enumSwap)) {
    for (const table of findSwapTables(unit)) {
      if (!release.updates.some(function moves(text) {
        return movesEnumValue(text, table, value)
      })) {
        problems.push(`removes ${value} from enum "${enumSwap.name}", but no expand migration moves the "${table}" rows that hold it, and the new release cannot read them. Add that UPDATE to the expand migration.`)
      }
      if (!seenUpdates.some(function moves(text) {
        return movesEnumValue(text, table, value)
      })) {
        problems.push(`removes ${value} from enum "${enumSwap.name}". Repeat the UPDATE that moves the "${table}" rows above BEGIN, for rows saved after the expand migration ran.`)
      }
    }
  }

  return problems
}

function readsTemporaryTable(unit, context) {
  const problems = []

  for (const [table, owner] of context.release.tempTables) {
    const name = new RegExp(`(^|[^\\w"])"?${table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?($|[^\\w"])`)
    if (owner !== context.name && unit.some(function reads(statement) {
      return name.test(statement.text)
    })) {
      problems.push(`reads the temporary table "${table}", which only lasts the session that made it, and this contract runs a deploy later. Drop it at the end of the expand migration, and create it again in this migration.`)
    }
  }

  return problems
}

function checkContractUnit(unit, result, context) {
  const { release, branch, seenUpdates } = context

  if (result.enumSwap) {
    return [...readsTemporaryTable(unit, context), ...checkEnumSwap(unit, result.enumSwap, context)]
  }

  const problems = [...readsTemporaryTable(unit, context), ...result.reasons
    .filter(function isBlocked(reason) {
      return reason.phase === 'blocked'
    })
    .map(function toText(reason) {
      return reason.text
    })]

  result.results.forEach(function checkStatement(statement, index) {
    if (statement.kind === 'drop-table') {
      for (const table of statement.tables.filter(function isStillRead(name) {
        return isLiveTable(branch, name)
      })) {
        problems.push(`drops table "${table}", but schema.prisma still has the model, so this release reads it. Delete the model, or mark it @@ignore.`)
      }
      return
    }

    if (statement.kind === 'drop-type' && branch.enums.has(statement.type)) {
      problems.push(`drops enum "${statement.type}", but schema.prisma still has it.`)
      return
    }

    if (statement.isAddition && statement.actions.length === 0) {
      problems.push(`adds something the new release needs as soon as it goes live (${unit[index].text.slice(0, 60)}). ${MOVE_HINT}`)
      return
    }

    for (const action of statement.actions) {
      const column = `"${statement.table}"."${action.column}"`

      if (action.isAddition) {
        problems.push(`changes "${statement.table}" in a way the new release needs as soon as it goes live (${action.text}). ${MOVE_HINT}`)
      } else if (action.kind === 'drop-column' && liveColumn(branch, statement.table, action.column)) {
        problems.push(`drops ${column}, but schema.prisma still has the field, so this release reads it. Delete the field, or mark it @ignore.`)
      } else if (action.kind === 'drop-column' && isRequiredWithoutDefault(liveColumn(release.live, statement.table, action.column))
        && !release.loosened.has(`${statement.table}.${action.column}`)) {
        problems.push(`drops ${column}, which is required with no default until then, so the new release cannot create a row. Add ALTER TABLE "${statement.table}" ALTER COLUMN "${action.column}" DROP NOT NULL; to the expand migration.`)
      } else if (action.kind === 'set-not-null' && branch.tables.get(statement.table)?.columns.get(action.column)?.isOptional) {
        problems.push(`makes ${column} required, but schema.prisma still lets it be empty.`)
      } else if (action.kind === 'set-not-null' && action.phase === 'contract') {
        // Filled in the expand migration so the new release never reads an empty row, and again
        // here for rows the old release saved in between.
        if (!release.updates.some(function fills(text) {
          return isBackfillOf(text, statement.table, action.column)
        })) {
          problems.push(`makes ${column} required, but no expand migration fills its empty rows, and the new release cannot read them. Add that UPDATE to the expand migration.`)
        }
        if (!seenUpdates.some(function fills(text) {
          return isBackfillOf(text, statement.table, action.column)
        })) {
          problems.push(`makes ${column} required, but rows saved before it runs can be empty, and then it fails and stops every later deploy. Repeat the UPDATE that fills them above it.`)
        }
      }
    }
  })

  return problems
}

export function findUnsafeChanges(liveSchemaText, migrations, branchSchemaText = liveSchemaText) {
  const parsed = migrations.map(parseMigration)
  const release = readRelease(liveSchemaText, parsed)
  const branch = parseSchema(branchSchemaText)
  const problems = []

  for (const migration of parsed) {
    const isContract = isContractMigration(migration.name)
    const splitHint = `Move it to a contract migration: pnpm db:migrate --split ${MIGRATIONS_DIR}/${migration.name}`
    const seenUpdates = []

    for (const unit of groupUnits(migration.statements)) {
      const result = classifyUnit(unit, release)

      if (!result.isMarked) {
        const messages = isContract
          ? checkContractUnit(unit, result, { name: migration.name, release, branch, seenUpdates })
          : checkExpandUnit(result, splitHint)

        for (const message of messages) {
          problems.push({ migration: migration.name, line: unit[0].line, message })
        }
      }

      for (const statement of unit) {
        if (isUpdate(statement.text)) {
          seenUpdates.push(statement.text)
        }
      }
    }
  }

  return problems
}

function run() {
  const baseRef = process.argv[2] ?? 'origin/master'

  if (!hasRef(baseRef)) {
    console.error(`✗ ${baseRef} not found. Run: git fetch origin master`)
    process.exit(1)
  }

  const migrations = listNewMigrations(baseRef)

  if (migrations.length === 0) {
    console.log(`✓ no migrations beyond ${baseRef}`)
    return
  }

  const problems = findUnsafeChanges(readSchemaAt(baseRef), migrations, readFileSync(SCHEMA_PATH, 'utf-8'))

  if (problems.length === 0) {
    console.log(`✓ ${migrations.length} new migration${migrations.length === 1 ? '' : 's'} keep ${baseRef} working`)
    return
  }

  for (const problem of problems) {
    console.error(`✗ ${MIGRATIONS_DIR}/${problem.migration}/migration.sql:${problem.line}  ${problem.message}`)
  }
  console.error('\nThe release in production keeps serving while a deploy migrates. See docs/prisma-workflow.md, "Expand and contract".')
  process.exit(1)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  run()
}
