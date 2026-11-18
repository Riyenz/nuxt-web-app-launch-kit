import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// Expand and contract. A deploy migrates while the release in production still answers requests,
// so a migration either adds what the new release needs (expand: applied by the deploy itself) or
// removes what only the old release needed (contract: a `*_contract` folder, applied by the first
// production deploy after a release that contains it is live). Anything that fits neither is
// blocked and needs a different schema change. One classifier decides this for `pnpm db:migrate`
// and for the check in CI. See docs/prisma-workflow.md.

export const MIGRATIONS_DIR = 'prisma/migrations'
export const SCHEMA_PATH = 'prisma/schema.prisma'
export const CONTRACT_SUFFIX = '_contract'

const NAME = '(?:"[^"]+"\\.)?"([^"]+)"'
const MARKER = /--\s*deploy-safe:\s*\S/i
const PHASE_RANK = { expand: 0, contract: 1, blocked: 2 }
const CREATE_TABLE = /^CREATE (?:(?:GLOBAL |LOCAL )?(TEMP|TEMPORARY) |UNLOGGED )?TABLE (?:IF NOT EXISTS )?(?:(?:"[^"]+"|\w+)\.)?(?:"([^"]+)"|(\w+))/i
const GIVES_DEFAULT = /^(?:ALTER COLUMN "([^"]+)" SET DEFAULT|ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)" .*\bDEFAULT) (?!NULL\b)/i
const ALTER_TABLE = new RegExp(`^ALTER TABLE (?:ONLY |IF EXISTS )*${NAME} (.*)$`, 'i')
const UPDATE_TABLE = new RegExp(`^UPDATE (?:ONLY )?${NAME}`, 'i')
const ADDITION = /^(ADD |ALTER COLUMN "[^"]+" (DROP NOT NULL|SET DEFAULT))/i
// Prisma Client fills these in itself, so the database holds no default for them.
const CLIENT_SIDE_DEFAULT = /^(cuid|uuid|nanoid|ulid)\(/

export function hasDatabaseDefault(field) {
  return Boolean(field?.defaultValue) && !CLIENT_SIDE_DEFAULT.test(field.defaultValue)
}

/// A release that does not know this column can only create a row once the column allows NULL.
export function isRequiredWithoutDefault(field) {
  return Boolean(field) && !field.isOptional && !hasDatabaseDefault(field) && !field.isId
}

export function isContractMigration(name) {
  return name.endsWith(CONTRACT_SUFFIX)
}

export function listMigrations(dir = MIGRATIONS_DIR) {
  if (!existsSync(dir)) {
    return []
  }

  return readdirSync(dir, { withFileTypes: true })
    .filter(function isMigration(entry) {
      return entry.isDirectory() && existsSync(`${dir}/${entry.name}/migration.sql`)
    })
    .map(function toName(entry) {
      return entry.name
    })
    .sort()
}

export function listContractMigrations(dir = MIGRATIONS_DIR) {
  return listMigrations(dir).filter(isContractMigration)
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function hasRef(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
    return true
  } catch {
    return false
  }
}

export function readSchemaAt(ref) {
  return git(['show', `${ref}:${SCHEMA_PATH}`])
}

/// The migrations in this working tree that `ref` (production) does not have yet.
export function listNewMigrations(ref) {
  const known = new Set(git(['ls-tree', '--name-only', `${ref}:${MIGRATIONS_DIR}`]).split('\n').filter(Boolean))

  return listMigrations()
    .filter(function isNew(name) {
      return !known.has(name)
    })
    .map(function toMigration(name) {
      return { name, sql: readFileSync(`${MIGRATIONS_DIR}/${name}/migration.sql`, 'utf-8') }
    })
}

function readAttribute(line, attribute) {
  const match = line.match(new RegExp(`${attribute}\\("([^"]+)"\\)`))
  return match ? match[1] : null
}

export function parseSchema(text) {
  const blocks = []
  let current = null

  for (const raw of text.split('\n')) {
    const line = raw.trim()

    if (line === '' || line.startsWith('//')) {
      continue
    }

    const opening = line.match(/^(model|enum)\s+(\w+)\s*\{/)
    if (opening) {
      current = { kind: opening[1], name: opening[2], dbName: opening[2], isIgnored: false, fields: [], values: [] }
      blocks.push(current)
      continue
    }

    if (!current) {
      continue
    }

    if (line === '}') {
      current = null
      continue
    }

    if (line.startsWith('@@')) {
      current.dbName = readAttribute(line, '@@map') ?? current.dbName
      current.isIgnored = current.isIgnored || line.startsWith('@@ignore')
      continue
    }

    if (current.kind === 'enum') {
      const value = line.match(/^(\w+)/)
      if (value) {
        current.values.push(readAttribute(line, '@map') ?? value[1])
      }
      continue
    }

    const field = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/)
    if (field) {
      const defaultValue = field[5].match(/@default\((.*)\)/)
      current.fields.push({
        name: field[1],
        type: field[2],
        column: readAttribute(field[5], '@map') ?? field[1],
        isOptional: Boolean(field[4]),
        isIgnored: /@ignore\b/.test(field[5]),
        isId: /@id\b/.test(field[5]),
        defaultValue: defaultValue ? defaultValue[1] : null
      })
    }
  }

  const modelNames = new Set(blocks
    .filter(function isModel(block) {
      return block.kind === 'model'
    })
    .map(function toName(block) {
      return block.name
    }))
  const tables = new Map()
  const enums = new Map()

  for (const block of blocks) {
    if (block.kind === 'enum') {
      enums.set(block.dbName, block.values)
      continue
    }

    const columns = new Map()
    for (const field of block.fields) {
      if (!modelNames.has(field.type)) {
        columns.set(field.column, field)
      }
    }
    tables.set(block.dbName, { isIgnored: block.isIgnored, columns })
  }

  return { tables, enums }
}

function hasMarker(comments) {
  return comments.some(function isMarker(comment) {
    return MARKER.test(comment)
  })
}

function trimBlankLines(lines) {
  let start = 0
  let end = lines.length

  while (start < end && lines[start].trim() === '') {
    start += 1
  }

  while (end > start && lines[end - 1].trim() === '') {
    end -= 1
  }

  return lines.slice(start, end)
}

export function readStatements(sql) {
  const statements = []
  let lines = []
  let rawLines = []
  let comments = []
  let startLine = 0
  let isInBlock = false
  let isInComment = false

  function finish(isTerminated) {
    const text = lines.join(' ').replace(isTerminated ? /;\s*(--.*)?$/ : /$/, '').replace(/\s+/g, ' ').trim()

    statements.push({
      text,
      line: startLine,
      isMarked: hasMarker(comments) || MARKER.test(lines.at(-1) ?? ''),
      raw: trimBlankLines(rawLines).join('\n')
    })
    lines = []
    rawLines = []

    // A marker above BEGIN covers the statements inside the transaction.
    if (!/^BEGIN$/i.test(text)) {
      comments = []
    }
  }

  sql.split('\n').forEach(function readLine(raw, index) {
    const line = raw.trim()
    rawLines.push(raw)

    // Prisma opens a migration that drops data with a /* Warnings: ... */ block.
    if (isInComment || (lines.length === 0 && line.startsWith('/*'))) {
      isInComment = !line.includes('*/')
      return
    }

    if (line.startsWith('--')) {
      comments.push(line)
      return
    }

    if (lines.length === 0) {
      if (line === '') {
        return
      }
      startLine = index + 1
    }

    lines.push(line)

    if ((line.match(/\$\$/g) ?? []).length % 2 === 1) {
      isInBlock = !isInBlock
    }

    if (!isInBlock && /;\s*(--.*)?$/.test(line)) {
      finish(true)
    }
  })

  if (lines.length > 0) {
    finish(false)
  }

  return statements
}

function splitTopLevel(text) {
  const parts = []
  let depth = 0
  let quote = null
  let start = 0

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quote) {
      if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '\'' || character === '"') {
      quote = character
    } else if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth -= 1
    } else if (character === ',' && depth === 0) {
      parts.push(text.slice(start, index).trim())
      start = index + 1
    }
  }

  parts.push(text.slice(start).trim())
  return parts.filter(Boolean)
}

export function parseMigration(migration) {
  return { ...migration, statements: readStatements(migration.sql) }
}

function liveTable(schema, table) {
  const entry = schema.tables.get(table)
  return entry && !entry.isIgnored ? entry : null
}

export function isLiveTable(schema, table) {
  return Boolean(liveTable(schema, table))
}

/// A column that this schema's Prisma Client reads.
export function liveColumn(schema, table, column) {
  const field = liveTable(schema, table)?.columns.get(column)
  return field && !field.isIgnored ? field : null
}

export function isUpdate(text) {
  return /^UPDATE /i.test(text)
}

/// An UPDATE of this table that names this column: a backfill.
export function isBackfillOf(text, table, column) {
  return text.match(UPDATE_TABLE)?.[1] === table && text.includes(`"${column}"`)
}

/// An UPDATE of this table that names this enum value: it moves the rows that hold it.
export function movesEnumValue(text, table, value) {
  return text.match(UPDATE_TABLE)?.[1] === table && text.includes(`'${value}'`)
}

/// The values of a schema's enum that a Prisma enum swap leaves out.
export function findRemovedValues(enums, enumSwap) {
  const kept = new Set(enumSwap.values)
  return (enums.get(enumSwap.name) ?? []).filter(function isRemoved(value) {
    return !kept.has(value)
  })
}

function readAlterTable(text) {
  const match = text.match(ALTER_TABLE)
  return match ? { table: match[1], actions: splitTopLevel(match[2]) } : null
}

/// The schema in production plus what this release's migrations create, give a default and
/// loosen, keyed "Table.column". Every rule below asks it whether production reads something.
export function readRelease(liveSchemaText, migrations) {
  const release = { live: parseSchema(liveSchemaText), createdTables: new Set(), tempTables: new Map(), defaulted: new Set(), loosened: new Set(), updates: [] }

  for (const migration of migrations) {
    const isContract = isContractMigration(migration.name)

    for (const statement of migration.statements) {
      const created = statement.text.match(CREATE_TABLE)
      const createdName = created ? created[2] ?? created[3] : null
      if (createdName) {
        release.createdTables.add(createdName)
      }
      // A temporary table lasts one session, and a contract runs in a later one.
      if (created?.[1]) {
        release.tempTables.set(createdName, migration.name)
      }

      if (isContract) {
        continue
      }

      if (isUpdate(statement.text)) {
        release.updates.push(statement.text)
      }

      const alterTable = readAlterTable(statement.text)
      for (const action of alterTable?.actions ?? []) {
        const loosened = action.match(/^ALTER COLUMN "([^"]+)" (DROP NOT NULL|SET DEFAULT)/i)?.[1]
        const givesDefault = action.match(GIVES_DEFAULT)
        const defaulted = givesDefault?.[1] ?? givesDefault?.[2]
        if (loosened) {
          release.loosened.add(`${alterTable.table}.${loosened}`)
        }
        const droppedDefault = action.match(/^ALTER COLUMN "([^"]+)" DROP DEFAULT/i)?.[1]
        if (droppedDefault) {
          release.defaulted.delete(`${alterTable.table}.${droppedDefault}`)
        }
        if (defaulted) {
          release.defaulted.add(`${alterTable.table}.${defaulted}`)
        }
      }
    }
  }

  return release
}

function worstPhase(items) {
  return items.reduce(function worst(current, item) {
    return PHASE_RANK[item.phase] > PHASE_RANK[current] ? item.phase : current
  }, 'expand')
}

function newColumnReason(table, column) {
  return `makes the new column "${table}"."${column}" required with no default, so every row the release in production creates leaves it empty and fails. Give the field a @default.`
}

/// One action of an ALTER TABLE. On a table production does not read, every action is an expand.
function classifyAction(table, action, actions, release, isLive) {
  const column = action.match(/^(?:DROP COLUMN (?:IF EXISTS )?|RENAME COLUMN |ADD COLUMN (?:IF NOT EXISTS )?|ALTER COLUMN )"([^"]+)"/i)?.[1] ?? null
  const field = isLive && column ? liveColumn(release.live, table, column) : null
  const result = { text: action, phase: 'expand', kind: 'other', column, isAddition: ADDITION.test(action) }

  if (/^DROP COLUMN /i.test(action)) {
    return field
      ? { ...result, phase: 'contract', kind: 'drop-column', reason: `drops "${table}"."${column}", which the release in production reads.` }
      : { ...result, kind: 'drop-column' }
  }

  if (/^ALTER COLUMN "[^"]+" SET NOT NULL/i.test(action)) {
    const entry = isLive ? liveTable(release.live, table).columns.get(column) : null
    if (isLive && !entry && !release.defaulted.has(`${table}.${column}`)) {
      return { ...result, phase: 'blocked', kind: 'set-not-null', reason: newColumnReason(table, column) }
    }
    return entry && (entry.isOptional || entry.isIgnored)
      ? { ...result, phase: 'contract', kind: 'set-not-null', reason: `makes "${table}"."${column}" required, but the release in production can still save it empty.` }
      : { ...result, kind: 'set-not-null' }
  }

  if (!isLive) {
    return result
  }

  if (/^RENAME TO /i.test(action)) {
    return { ...result, phase: 'blocked', kind: 'rename-table', reason: `renames table "${table}", which the release in production reads. Rename the model only and keep the table with @@map("${table}").` }
  }

  if (/^RENAME COLUMN /i.test(action) && field) {
    return { ...result, phase: 'blocked', kind: 'rename-column', reason: `renames "${table}"."${column}", which the release in production reads. Rename the field in schema.prisma only and keep the column with @map("${column}").` }
  }

  if (/^ADD COLUMN /i.test(action) && /\bNOT NULL\b/i.test(action) && !/\b(DEFAULT|GENERATED)\b/i.test(action)) {
    return { ...result, phase: 'blocked', kind: 'add-required', reason: `adds "${table}"."${column}" as required with no default, so every row the release in production creates fails. Give the field a @default. A renamed field shows up like this: keep the old column with @map instead.` }
  }

  if (/^ALTER COLUMN "[^"]+" (?:SET DATA )?TYPE /i.test(action) && field) {
    return { ...result, phase: 'blocked', kind: 'change-type', reason: `changes the type of "${table}"."${column}", which the release in production reads. Add a new column instead, and drop this one in a contract migration.` }
  }

  if (/^ALTER COLUMN "[^"]+" DROP DEFAULT/i.test(action)) {
    // DROP DEFAULT with a SET DEFAULT for the same column is one change of default.
    const isSetAgain = actions.some(function setsDefault(other) {
      return other.toUpperCase().startsWith(`ALTER COLUMN "${column.toUpperCase()}" SET DEFAULT`)
    })
    // A column production does not know is one it leaves out of every row it creates.
    const isNew = !liveTable(release.live, table).columns.has(column)
    return !isSetAgain && (isNew || (field && !field.isOptional && hasDatabaseDefault(field)))
      ? { ...result, phase: 'contract', kind: 'drop-default', reason: `drops the default of "${table}"."${column}", which the release in production leaves out when it creates a row.` }
      : { ...result, kind: 'drop-default' }
  }

  return result
}

function classifyStatement(statement, release) {
  const { live, createdTables } = release
  const text = statement.text
  const result = { phase: 'expand', kind: 'other', table: null, actions: [], reasons: [], isAddition: false }

  if (/^CREATE /i.test(text) || /^ALTER TYPE .* ADD VALUE /i.test(text)) {
    // A temporary table is scratch space for a backfill, not something the new release reads.
    return { ...result, isAddition: !text.match(CREATE_TABLE)?.[1] }
  }

  const dropTable = text.match(/^DROP TABLE (?:IF EXISTS )?(.*)$/i)
  if (dropTable) {
    const tables = [...dropTable[1].matchAll(new RegExp(NAME, 'g'))].map(function toTable(match) {
      return match[1]
    })
    const reasons = tables
      .filter(function isRead(table) {
        return !createdTables.has(table) && isLiveTable(live, table)
      })
      .map(function toReason(table) {
        return { phase: 'contract', text: `drops table "${table}", which the release in production reads.` }
      })
    return { ...result, kind: 'drop-table', tables, reasons, phase: worstPhase(reasons) }
  }

  const alterTable = readAlterTable(text)
  if (alterTable) {
    const isLive = !createdTables.has(alterTable.table) && isLiveTable(live, alterTable.table)
    const actions = alterTable.actions.map(function classify(action) {
      return classifyAction(alterTable.table, action, alterTable.actions, release, isLive)
    })
    const reasons = actions
      .filter(function hasReason(action) {
        return action.reason
      })
      .map(function toReason(action) {
        return { phase: action.phase, text: action.reason }
      })
    return {
      ...result,
      table: alterTable.table,
      actions,
      reasons,
      phase: worstPhase(actions),
      isAddition: actions.some(function isAddition(action) {
        return action.isAddition
      })
    }
  }

  const renameValue = text.match(new RegExp(`^ALTER TYPE ${NAME} RENAME VALUE '([^']+)'`, 'i'))
  if (renameValue && live.enums.has(renameValue[1])) {
    const reason = `renames ${renameValue[2]} in enum "${renameValue[1]}", which the release in production may still send. Add the new value, move the rows, and drop the old value in a contract migration.`
    return { ...result, phase: 'blocked', reasons: [{ phase: 'blocked', text: reason }] }
  }

  const dropType = text.match(new RegExp(`^DROP TYPE (?:IF EXISTS )?${NAME}`, 'i'))
  if (dropType) {
    const isRead = live.enums.has(dropType[1])
    return {
      ...result,
      kind: 'drop-type',
      type: dropType[1],
      phase: isRead ? 'contract' : 'expand',
      reasons: isRead ? [{ phase: 'contract', text: `drops enum "${dropType[1]}", which the release in production reads.` }] : []
    }
  }

  return result
}

/// Statements between BEGIN and COMMIT move together. Prisma removes an enum value this way.
export function groupUnits(statements) {
  const units = []
  let open = null

  for (const statement of statements) {
    if (/^BEGIN$/i.test(statement.text)) {
      open = [statement]
      continue
    }

    if (open) {
      open.push(statement)
      if (/^COMMIT$/i.test(statement.text)) {
        units.push(open)
        open = null
      }
      continue
    }

    units.push([statement])
  }

  if (open) {
    units.push(open)
  }

  return units
}

/// The tables whose columns a Prisma enum swap moves to the new type: the rows to move live there.
export function findSwapTables(unit) {
  const tables = new Set()

  for (const statement of unit) {
    const alterTable = readAlterTable(statement.text)
    if (alterTable?.actions.some(function changesToNewType(action) {
      return /^ALTER COLUMN "[^"]+" (?:SET DATA )?TYPE "[^"]+_new"/i.test(action)
    })) {
      tables.add(alterTable.table)
    }
  }

  return [...tables]
}

function readEnumSwap(unit) {
  for (const statement of unit) {
    const match = statement.text.match(new RegExp(`^CREATE TYPE ${NAME} AS ENUM \\((.*)\\)$`, 'i'))
    if (match && /_new$/.test(match[1])) {
      const values = [...match[2].matchAll(/'((?:[^']|'')*)'/g)].map(function toValue(value) {
        return value[1]
      })
      return { name: match[1].replace(/_new$/, ''), values }
    }
  }

  return null
}

/// A unit is the smallest piece that can move between the expand and the contract migration.
/// `reasons` says why it cannot stay in the expand migration.
export function classifyUnit(unit, release) {
  const isMarked = unit.some(function marked(statement) {
    return statement.isMarked
  })
  const results = unit.map(function classify(statement) {
    return classifyStatement(statement, release)
  })
  const enumSwap = unit.length > 1 ? readEnumSwap(unit) : null

  if (enumSwap) {
    const removed = findRemovedValues(release.live.enums, enumSwap)
    const reasons = removed.length > 0
      ? [{ phase: 'contract', text: `removes ${removed.join(', ')} from enum "${enumSwap.name}", which the release in production may still send.` }]
      : []
    return { phase: worstPhase(reasons), isMarked, enumSwap, results, reasons }
  }

  return {
    phase: worstPhase(results),
    isMarked,
    enumSwap: null,
    results,
    reasons: results.flatMap(function toReasons(result) {
      return result.reasons
    })
  }
}
