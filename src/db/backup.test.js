import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { createAttempt } from './attempts.js'
import { BACKUP_FORMAT, BACKUP_VERSION, BackupError, exportBackup, importBackup } from './backup.js'
import { addFlag, listFlags } from './flags.js'
import { listProgressForCert, markReviewComplete } from './progress.js'
import { getSetting, setSetting } from './settings.js'

beforeEach(resetDb)

describe('exportBackup', () => {
  it('exports every table with format metadata', async () => {
    await setSetting('testLengths', { pre: 10 })
    await addFlag(
      { itemId: 'clf-c02-1.1-0001', itemVersion: 1, certId: 'clf-c02', reason: 'typo' },
      1_000,
    )
    const backup = await exportBackup(Date.UTC(2026, 9, 13))
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.exportedAt).toBe('2026-10-13T00:00:00.000Z')
    expect(backup.tables.settings).toEqual([{ key: 'testLengths', value: { pre: 10 } }])
    expect(backup.tables.flags).toHaveLength(1)
    expect(backup.tables.attempts).toEqual([])
    expect(backup.tables.itemStats).toEqual([])
    expect(backup.tables.subdomainProgress).toEqual([])
  })
})

describe('importBackup', () => {
  it('replaces all existing data with the backup contents', async () => {
    await setSetting('testLengths', { pre: 10 })
    const backup = await exportBackup()

    await resetDb()
    await setSetting('somethingNewer', true)
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 1)

    await importBackup(backup)
    expect(await getSetting('testLengths', null)).toEqual({ pre: 10 })
    expect(await getSetting('somethingNewer', null)).toBeNull()
    expect(await listProgressForCert('clf-c02')).toEqual([])
  })

  it('accepts a backup that went through a JSON file round trip', async () => {
    await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ['clf-c02-1.1-0001'],
      optionOrder: { 'clf-c02-1.1-0001': ['a', 'b', 'c', 'd'] },
    })
    await addFlag({ itemId: 'x', itemVersion: 1, certId: 'clf-c02', reason: 'other' })
    const json = JSON.parse(JSON.stringify(await exportBackup()))

    await resetDb()
    await importBackup(json)
    const restored = await exportBackup()
    expect(restored.tables.attempts).toHaveLength(1)
    expect(await listFlags()).toHaveLength(1)
  })

  it.each([
    ['a non-object', 'nope'],
    ['a different file format', { format: 'other', version: 1, tables: {} }],
    ['a newer backup version', { format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, tables: {} }],
    [
      'a missing table',
      { format: BACKUP_FORMAT, version: BACKUP_VERSION, tables: { attempts: [] } },
    ],
  ])('rejects %s and leaves existing data untouched', async (_label, bad) => {
    await setSetting('keep', 1)
    await expect(importBackup(bad)).rejects.toThrow(BackupError)
    expect(await getSetting('keep', null)).toBe(1)
  })
})
