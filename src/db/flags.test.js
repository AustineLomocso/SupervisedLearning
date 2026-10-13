import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import {
  addFlag,
  buildReportsExport,
  clearFlags,
  deleteFlag,
  FLAG_REASON_LABELS,
  FLAG_REASONS,
  listFlags,
} from './flags.js'

/** @param {object} [overrides] */
const report = (overrides = {}) => ({
  itemId: 'clf-c02-1.1-0001',
  itemVersion: 1,
  certId: 'clf-c02',
  reason: 'wrong-answer',
  note: '  Option B is also correct.  ',
  ...overrides,
})

beforeEach(resetDb)

describe('flags', () => {
  it('offers the five report reasons', () => {
    expect(FLAG_REASONS).toEqual(['wrong-answer', 'unclear', 'outdated', 'typo', 'other'])
  })

  it('has a label for every reason', () => {
    expect(Object.keys(FLAG_REASON_LABELS).sort()).toEqual([...FLAG_REASONS].sort())
  })

  it('wraps reports in a versioned export', async () => {
    await addFlag(report(), 1_000)
    const flags = await listFlags()
    expect(buildReportsExport(flags, Date.UTC(2026, 9, 14))).toEqual({
      format: 'awsprep-reports',
      version: 1,
      exportedAt: '2026-10-14T00:00:00.000Z',
      reports: flags,
    })
  })

  it('stores a report with a trimmed note and returns its id', async () => {
    const id = await addFlag(report(), 1_000)
    expect(await listFlags()).toEqual([
      {
        id,
        itemId: 'clf-c02-1.1-0001',
        itemVersion: 1,
        certId: 'clf-c02',
        reason: 'wrong-answer',
        note: 'Option B is also correct.',
        createdAt: 1_000,
      },
    ])
  })

  it('stores an empty note when none is given', async () => {
    await addFlag(report({ note: undefined }), 1_000)
    expect((await listFlags())[0].note).toBe('')
  })

  it('lists reports newest first', async () => {
    const first = await addFlag(report(), 1_000)
    const second = await addFlag(report({ reason: 'typo' }), 2_000)
    expect((await listFlags()).map((flag) => flag.id)).toEqual([second, first])
  })

  it('rejects an unknown reason', async () => {
    await expect(addFlag(report({ reason: 'spam' }))).rejects.toThrow('Unknown flag reason: spam')
  })

  it('deletes one report or clears them all', async () => {
    const first = await addFlag(report(), 1_000)
    await addFlag(report(), 2_000)
    await deleteFlag(first)
    expect(await listFlags()).toHaveLength(1)
    await clearFlags()
    expect(await listFlags()).toEqual([])
  })
})
