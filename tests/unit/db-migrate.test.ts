import { describe, expect, it } from 'vitest'

import { nextTimestamp, splitMigration } from '../../scripts/db-migrate.mjs'

const LIVE_SCHEMA = `
enum R {
  A
  B
  C
}

model Account {
  id       String  @id @default(cuid())
  code     String
  nickname String?
  plan     String  @default("FREE")
  token    String  @default(uuid())
  r        R       @default(A)
}
`

function split(sql: string, branchSchemaText = LIVE_SCHEMA) {
  return splitMigration({ name: '20261020120000_change', sql }, { liveSchemaText: LIVE_SCHEMA, branchSchemaText })
}

function without(...lines: string[]) {
  return lines.reduce(function remove(schema, line) {
    return schema.replace(`${line}\n`, '')
  }, LIVE_SCHEMA)
}

describe('splitMigration', () => {
  it('leaves a migration that removes nothing alone', () => {
    expect(split('-- AlterTable\nALTER TABLE "Account" ADD COLUMN "email" TEXT;\n')).toEqual({
      expandSql: '-- AlterTable\nALTER TABLE "Account" ADD COLUMN "email" TEXT;\n',
      contractSql: '',
      blocked: [],
      problems: []
    })
  })

  it('moves drops to the contract, lets the new release leave required columns empty, and passes the check', () => {
    const { expandSql, contractSql, blocked, problems } = split([
      '/*',
      '  Warnings:',
      '',
      '  - You are about to drop the column `code` on the `Account` table. All the data in the column will be lost.',
      '',
      '*/',
      '-- AlterTable',
      'ALTER TABLE "Account" DROP COLUMN "code",',
      'DROP COLUMN "nickname",',
      'DROP COLUMN "plan",',
      'ADD COLUMN     "email" TEXT;',
      '',
      '-- CreateTable',
      'CREATE TABLE "Task" (',
      '    "id" TEXT NOT NULL',
      ');'
    ].join('\n'), without('  code     String', '  nickname String?', '  plan     String  @default("FREE")').replace('  token', '  email    String?\n  token'))

    expect(blocked).toEqual([])
    expect(problems).toEqual([])
    expect(expandSql).toBe([
      '-- AlterTable',
      'ALTER TABLE "Account" ADD COLUMN "email" TEXT;',
      '',
      '-- CreateTable',
      'CREATE TABLE "Task" (',
      '    "id" TEXT NOT NULL',
      ');',
      '',
      '-- The new release leaves these columns empty until the contract migration drops them.',
      'ALTER TABLE "Account" ALTER COLUMN "code" DROP NOT NULL;',
      ''
    ].join('\n'))
    expect(contractSql).toContain('-- Contract migration.')
    expect(contractSql).toContain('ALTER TABLE "Account" DROP COLUMN "code",\nDROP COLUMN "nickname",\nDROP COLUMN "plan";')
  })

  it('keeps the drop of a temporary table with the backfill that made it', () => {
    const { expandSql, contractSql } = split('CREATE TEMP TABLE "_Pairs" AS SELECT "id" FROM "Account";\nUPDATE "Account" SET "plan" = \'FREE\';\nDROP TABLE "_Pairs";\n')

    expect(contractSql).toBe('')
    expect(expandSql).toContain('DROP TABLE "_Pairs";')
  })

  it('lets the new release leave a column empty when Prisma, not the database, fills its default', () => {
    const { expandSql } = split('ALTER TABLE "Account" DROP COLUMN "token";', without('  token    String  @default(uuid())'))

    expect(expandSql).toContain('ALTER TABLE "Account" ALTER COLUMN "token" DROP NOT NULL;')
  })

  it('keeps one change of default together', () => {
    expect(split('ALTER TABLE "Account" ALTER COLUMN "plan" DROP DEFAULT,\nALTER COLUMN "plan" SET DEFAULT \'STARTER\';').contractSql).toBe('')
  })

  it('leaves a column that is already required alone', () => {
    expect(split('ALTER TABLE "Account" ALTER COLUMN "code" SET NOT NULL;').contractSql).toBe('')
  })

  it('leaves a TODO in both halves for a column made required, and stops until it is a real UPDATE', () => {
    const branch = LIVE_SCHEMA.replace('  nickname String?', '  nickname String')
    const { expandSql, contractSql, problems } = split('ALTER TABLE "Account" ALTER COLUMN "nickname" SET NOT NULL;', branch)

    expect(expandSql).toContain('-- TODO: fill the empty rows of "Account"."nickname"')
    expect(contractSql).toContain('-- TODO: repeat the expand migration\'s UPDATE that fills "Account"."nickname" here')
    expect(problems.map(function toMessage(problem) {
      return problem.message
    })).toEqual([
      expect.stringContaining('no expand migration fills its empty rows'),
      expect.stringContaining('Repeat the UPDATE that fills them above it')
    ])
  })

  it('blocks a new column made required with no default', () => {
    const { blocked } = split([
      'ALTER TABLE "Account" ADD COLUMN "email" TEXT;',
      'UPDATE "Account" SET "email" = \'\';',
      'ALTER TABLE "Account" ALTER COLUMN "email" SET NOT NULL;'
    ].join('\n'))

    expect(blocked).toEqual([{ line: 3, reason: expect.stringContaining('Give the field a @default') }])
  })

  it('moves a whole enum swap to the contract, with a TODO for the rows of each table', () => {
    const swap = [
      '-- AlterEnum',
      'BEGIN;',
      'CREATE TYPE "R_new" AS ENUM (\'A\', \'B\');',
      'ALTER TABLE "Account" ALTER COLUMN "r" DROP DEFAULT;',
      'ALTER TABLE "Account" ALTER COLUMN "r" TYPE "R_new" USING ("r"::text::"R_new");',
      'ALTER TYPE "R" RENAME TO "R_old";',
      'ALTER TYPE "R_new" RENAME TO "R";',
      'DROP TYPE "R_old";',
      'ALTER TABLE "Account" ALTER COLUMN "r" SET DEFAULT \'A\';',
      'COMMIT;'
    ].join('\n')
    const { expandSql, contractSql, problems } = split(swap, LIVE_SCHEMA.replace('  C\n', ''))

    expect(expandSql).toContain('-- TODO: move the "Account" rows that hold C')
    expect(contractSql).toContain(`-- TODO: repeat the expand migration's UPDATE that moves the "Account" rows holding C here, for rows saved in between.\n${swap}`)
    expect(problems.length).toBeGreaterThan(0)
  })

  it('blocks a rename, which no phase can serve both releases', () => {
    const { blocked } = split('ALTER TABLE "Account" DROP COLUMN "nickname",\nADD COLUMN "displayName" TEXT NOT NULL;')

    expect(blocked).toEqual([{ line: 1, reason: expect.stringContaining('keep the old column with @map') }])
  })
})

describe('nextTimestamp', () => {
  it('names the contract folder one second after the expand folder', () => {
    expect(nextTimestamp('20261020120000')).toBe('20261020120001')
    expect(nextTimestamp('20261231235959')).toBe('20270101000000')
  })
})
