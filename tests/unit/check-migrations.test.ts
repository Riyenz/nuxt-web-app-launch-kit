import { describe, expect, it } from 'vitest'

import { findUnsafeChanges } from '../../scripts/ci/check-migrations.mjs'

const LIVE_SCHEMA = `
enum AccountRole {
  OWNER
  MEMBER
  GUEST
}

model Account {
  id       String      @id @default(cuid())
  role     AccountRole @default(MEMBER)
  nickname String?
  plan     String      @default("FREE")
  code     String
  oldNote  String?     @ignore
  projects Project[]
}

model Project {
  id      String  @id @default(cuid())
  ownerId String
  owner   Account @relation(fields: [ownerId], references: [id])
  name    String
}

model Legacy {
  id String @id

  @@ignore
}
`

const BRANCH_SCHEMA = LIVE_SCHEMA.replace('  nickname String?\n', '').replace('  code     String\n', '')

function check(sql: string) {
  return findUnsafeChanges(LIVE_SCHEMA, [{ name: '20261020000000_test', sql }]).map(function toMessage(problem) {
    return problem.message
  })
}

function checkRelease(migrations: Array<{ name: string, sql: string }>, branchSchema = BRANCH_SCHEMA) {
  return findUnsafeChanges(LIVE_SCHEMA, migrations, branchSchema).map(function toMessage(problem) {
    return problem.message
  })
}

describe('migrations that production survives', () => {
  it('passes a new table, a column with a default, an optional column and a new enum value', () => {
    expect(check(`
      CREATE TABLE "Task" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL);
      ALTER TABLE "Project" ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN "note" TEXT;
      ALTER TYPE "AccountRole" ADD VALUE 'VIEWER';
    `)).toEqual([])
  })

  it('passes changes to a table this release creates', () => {
    expect(check(`
      CREATE TABLE "Task" ("id" TEXT NOT NULL);
      ALTER TABLE "Task" ADD COLUMN "year" INTEGER NOT NULL;
      ALTER TABLE "Task" ALTER COLUMN "year" SET NOT NULL;
      DROP TABLE "Task";
    `)).toEqual([])
  })

  it('passes a column or table production already ignores', () => {
    expect(check(`
      ALTER TABLE "Account" DROP COLUMN "oldNote";
      DROP TABLE "Legacy";
    `)).toEqual([])
  })

  it('passes tightening a column production always fills', () => {
    expect(check('ALTER TABLE "Project" ALTER COLUMN "name" SET NOT NULL;')).toEqual([])
  })
})

describe('migrations that break production', () => {
  it('flags a dropped column and a dropped table, and names the command that splits them out', () => {
    expect(check(`
      ALTER TABLE "Account" DROP COLUMN "nickname";
      DROP TABLE "Project";
    `)).toEqual([
      expect.stringContaining('drops "Account"."nickname"'),
      expect.stringContaining('drops table "Project"')
    ])
    expect(check('ALTER TABLE "Account" DROP COLUMN "nickname";')[0]).toContain('pnpm db:migrate --split prisma/migrations/20261020000000_test')
  })

  it('flags a renamed column and a renamed table', () => {
    expect(check(`
      ALTER TABLE "Account" RENAME COLUMN "nickname" TO "displayName";
      ALTER TABLE "Project" RENAME TO "Workspace";
    `)).toEqual([
      expect.stringContaining('@map("nickname")'),
      expect.stringContaining('@@map("Project")')
    ])
  })

  it('flags a required column with no default on an existing table', () => {
    expect(check('ALTER TABLE "Project" ADD COLUMN "timezone" TEXT NOT NULL;')).toEqual([
      expect.stringContaining('adds "Project"."timezone" as required with no default')
    ])
  })

  it('flags a new column filled and then made required, unless it has a default', () => {
    const sql = [
      'ALTER TABLE "Project" ADD COLUMN "timezone" TEXT;',
      'UPDATE "Project" SET "timezone" = \'UTC\';',
      'ALTER TABLE "Project" ALTER COLUMN "timezone" SET NOT NULL;'
    ].join('\n')

    expect(check(sql)).toEqual([expect.stringContaining('Give the field a @default')])
    expect(check(sql.replace('"timezone" TEXT;', '"timezone" TEXT DEFAULT NULL;'))).toEqual([expect.stringContaining('Give the field a @default')])
    expect(check(sql.replace('"timezone" TEXT;', '"timezone" TEXT DEFAULT \'UTC\';'))).toEqual([])
  })

  it('flags making an optional column required', () => {
    expect(check('ALTER TABLE "Account" ALTER COLUMN "nickname" SET NOT NULL;')).toEqual([
      expect.stringContaining('makes "Account"."nickname" required')
    ])
  })

  it('flags a column type change', () => {
    expect(check('ALTER TABLE "Project" ALTER COLUMN "name" SET DATA TYPE VARCHAR(80);')).toEqual([
      expect.stringContaining('changes the type of "Project"."name"')
    ])
  })

  it('flags a dropped database default production relies on', () => {
    expect(check('ALTER TABLE "Account" ALTER COLUMN "plan" DROP DEFAULT;')).toEqual([
      expect.stringContaining('drops the default of "Account"."plan"')
    ])
  })

  it('flags an enum value removed by Prisma\'s swap once, not each step of it', () => {
    expect(check(`
      -- AlterEnum
      BEGIN;
      CREATE TYPE "AccountRole_new" AS ENUM ('OWNER', 'MEMBER');
      ALTER TABLE "Account" ALTER COLUMN "role" DROP DEFAULT;
      ALTER TABLE "Account" ALTER COLUMN "role" TYPE "AccountRole_new" USING ("role"::text::"AccountRole_new");
      ALTER TYPE "AccountRole" RENAME TO "AccountRole_old";
      ALTER TYPE "AccountRole_new" RENAME TO "AccountRole";
      DROP TYPE "public"."AccountRole_old";
      ALTER TABLE "Account" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
      COMMIT;
    `)).toEqual([expect.stringContaining('removes GUEST from enum "AccountRole"')])
  })

  it('lets a deploy-safe comment above BEGIN pass the enum swap', () => {
    expect(check(`
      -- deploy-safe: the live release stopped naming GUEST
      BEGIN;
      CREATE TYPE "AccountRole_new" AS ENUM ('OWNER', 'MEMBER');
      COMMIT;
    `)).toEqual([])
  })

  it('reports the line of the statement', () => {
    const [problem] = findUnsafeChanges(LIVE_SCHEMA, [{
      name: '20261020000000_test',
      sql: '-- AlterTable\nALTER TABLE "Account"\n  DROP COLUMN "nickname";\n'
    }])

    expect(problem?.line).toBe(2)
  })
})

describe('contract migrations', () => {
  it('passes a drop of a field the new release no longer has', () => {
    expect(checkRelease([
      { name: '20261020000001_drop_nickname_contract', sql: 'ALTER TABLE "Account" DROP COLUMN "nickname";' }
    ])).toEqual([])
  })

  it('flags a drop of a field schema.prisma still has', () => {
    expect(checkRelease([
      { name: '20261020000001_drop_nickname_contract', sql: 'ALTER TABLE "Account" DROP COLUMN "nickname";' }
    ], LIVE_SCHEMA)).toEqual([expect.stringContaining('schema.prisma still has the field')])
  })

  it('flags a required column the new release cannot leave empty until the drop runs', () => {
    expect(checkRelease([
      { name: '20261020000001_drop_code_contract', sql: 'ALTER TABLE "Account" DROP COLUMN "code";' }
    ])).toEqual([expect.stringContaining('DROP NOT NULL')])

    expect(checkRelease([
      { name: '20261020000000_drop_code', sql: 'ALTER TABLE "Account" ALTER COLUMN "code" DROP NOT NULL;' },
      { name: '20261020000001_drop_code_contract', sql: 'ALTER TABLE "Account" DROP COLUMN "code";' }
    ])).toEqual([])
  })

  it('flags an addition, which the new release needs before a contract migration runs', () => {
    expect(checkRelease([
      { name: '20261020000001_misc_contract', sql: 'ALTER TABLE "Project" ADD COLUMN "note" TEXT;\nCREATE TABLE "Task" ("id" TEXT NOT NULL);' }
    ])).toEqual([
      expect.stringContaining('move this to the expand migration'),
      expect.stringContaining('move this to the expand migration')
    ])
  })

  it('passes an enum value the new release no longer has, once its rows move in both halves', () => {
    const branchSchema = BRANCH_SCHEMA.replace('  GUEST\n', '')
    const move = 'UPDATE "Account" SET "role" = \'MEMBER\' WHERE "role" = \'GUEST\';'
    const sql = `${move}
BEGIN;
CREATE TYPE "AccountRole_new" AS ENUM ('OWNER', 'MEMBER');
ALTER TABLE "Account" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "role" TYPE "AccountRole_new" USING ("role"::text::"AccountRole_new");
ALTER TYPE "AccountRole" RENAME TO "AccountRole_old";
ALTER TYPE "AccountRole_new" RENAME TO "AccountRole";
DROP TYPE "AccountRole_old";
ALTER TABLE "Account" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;`

    const expand = { name: '20261020000000_drop_guest', sql: move }
    const contract = { name: '20261020000001_drop_guest_contract', sql }

    expect(checkRelease([expand, contract], branchSchema)).toEqual([])
    expect(checkRelease([expand, contract])).toEqual([expect.stringContaining('schema.prisma still has it')])
    expect(checkRelease([contract], branchSchema)).toEqual([expect.stringContaining('no expand migration moves the "Account" rows')])
    expect(checkRelease([expand, { ...contract, sql: sql.replace(`${move}\n`, '') }], branchSchema)).toEqual([
      expect.stringContaining('Repeat the UPDATE that moves the "Account" rows above BEGIN')
    ])
  })

  it('asks for the rows of every table an enum swap changes', () => {
    const branchSchema = BRANCH_SCHEMA.replace('  GUEST\n', '')
    const move = 'UPDATE "Account" SET "role" = \'MEMBER\' WHERE "role" = \'GUEST\';'
    const sql = `${move}
BEGIN;
CREATE TYPE "AccountRole_new" AS ENUM ('OWNER', 'MEMBER');
ALTER TABLE "Account" ALTER COLUMN "role" TYPE "AccountRole_new" USING ("role"::text::"AccountRole_new");
ALTER TABLE "Invite" ALTER COLUMN "role" TYPE "AccountRole_new" USING ("role"::text::"AccountRole_new");
COMMIT;`

    expect(checkRelease([{ name: '20261020000000_drop_guest', sql: move }, { name: '20261020000001_drop_guest_contract', sql }], branchSchema)).toEqual([
      expect.stringContaining('no expand migration moves the "Invite" rows'),
      expect.stringContaining('Repeat the UPDATE that moves the "Invite" rows')
    ])
  })

  it('flags a contract that reads a temporary table an earlier session made', () => {
    const branchSchema = LIVE_SCHEMA.replace('  nickname String?\n', '  nickname String\n')
    const backfill = 'UPDATE "Account" SET "nickname" = "_Names"."name" FROM "_Names" WHERE "_Names"."id" = "Account"."id";'

    expect(checkRelease([
      { name: '20261020000000_nickname', sql: `CREATE TEMP TABLE "_Names" AS SELECT "id", 'x' AS "name" FROM "Account";\n${backfill}` },
      { name: '20261020000001_nickname_contract', sql: `${backfill}\nALTER TABLE "Account" ALTER COLUMN "nickname" SET NOT NULL;` }
    ], branchSchema)).toEqual([expect.stringContaining('reads the temporary table "_Names"')])
  })

  it('asks for the backfill of a column made required in the expand migration and again in the contract', () => {
    const branchSchema = LIVE_SCHEMA.replace('  nickname String?\n', '  nickname String\n')
    const setNotNull = 'ALTER TABLE "Account" ALTER COLUMN "nickname" SET NOT NULL;'
    const backfill = 'UPDATE "Account" SET "nickname" = \'\' WHERE "nickname" IS NULL;'
    const expand = { name: '20261020000000_nickname', sql: backfill }

    expect(checkRelease([{ name: '20261020000001_nickname_contract', sql: setNotNull }], branchSchema)).toEqual([
      expect.stringContaining('no expand migration fills its empty rows'),
      expect.stringContaining('Repeat the UPDATE that fills them above it')
    ])
    expect(checkRelease([{ name: '20261020000001_nickname_contract', sql: `${backfill}\n${setNotNull}` }], branchSchema)).toEqual([
      expect.stringContaining('no expand migration fills its empty rows')
    ])
    expect(checkRelease([expand, { name: '20261020000001_nickname_contract', sql: `${backfill}\n${setNotNull}` }], branchSchema)).toEqual([])
  })
})

describe('defaults and temporary tables', () => {
  it('flags dropping the default of a column this release added, which production leaves out', () => {
    expect(checkRelease([
      { name: '20261020000000_timezone', sql: 'ALTER TABLE "Project" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT \'UTC\';' },
      { name: '20261020000001_timezone_no_default', sql: 'ALTER TABLE "Project" ALTER COLUMN "timezone" DROP DEFAULT;' }
    ], LIVE_SCHEMA)).toEqual([expect.stringContaining('drops the default of "Project"."timezone"')])
  })

  it('lets a contract build its own temporary table again, and flags one it only reads', () => {
    const branchSchema = LIVE_SCHEMA.replace('  nickname String?\n', '  nickname String\n')
    const backfill = 'UPDATE "Account" SET "nickname" = "_Names"."name" FROM "_Names" WHERE "_Names"."id" = "Account"."id";'
    const build = 'CREATE TEMP TABLE "_Names" AS SELECT "id", \'x\' AS "name" FROM "Account";'
    const expand = { name: '20261020000000_nickname', sql: `${build}\n${backfill}\nDROP TABLE "_Names";` }
    const setNotNull = 'ALTER TABLE "Account" ALTER COLUMN "nickname" SET NOT NULL;'

    expect(checkRelease([expand, { name: '20261020000001_nickname_contract', sql: `${build}\n${backfill}\n${setNotNull}` }], branchSchema)).toEqual([])
    expect(checkRelease([
      { name: '20261020000000_nickname', sql: 'CREATE TEMP TABLE names AS SELECT 1;\nUPDATE "Account" SET "nickname" = \'\' WHERE "nickname" IS NULL;' },
      { name: '20261020000001_nickname_contract', sql: `UPDATE "Account" SET "nickname" = names.x FROM names;\n${setNotNull}` }
    ], branchSchema)).toEqual([expect.stringContaining('reads the temporary table "names"')])
  })
})
