import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db.js'
import { resetDb } from '../test/resetDb.js'
import { getStatsForCert, getStatsForSubdomain, recordAnswer, recordAnswers } from './itemStats.js'

/** @param {object} [overrides] */
const answer = (overrides = {}) => ({
  itemId: 'clf-c02-1.1-0001',
  certId: 'clf-c02',
  subdomainId: 'clf-c02/1.1',
  itemVersion: 1,
  correct: true,
  at: 1_000,
  ...overrides,
})

beforeEach(resetDb)

describe('recordAnswer', () => {
  it('creates stats on the first answer', async () => {
    await recordAnswer(answer())
    expect(await getStatsForSubdomain('clf-c02/1.1')).toEqual([
      {
        itemId: 'clf-c02-1.1-0001',
        certId: 'clf-c02',
        subdomainId: 'clf-c02/1.1',
        itemVersion: 1,
        seenCount: 1,
        correctCount: 1,
        lastSeenAt: 1_000,
        lastCorrect: true,
      },
    ])
  })

  it('accumulates counts and keeps the latest outcome and version', async () => {
    await recordAnswer(answer({ correct: true, at: 1_000 }))
    await recordAnswer(answer({ correct: false, at: 2_000, itemVersion: 2 }))
    const [stat] = await getStatsForSubdomain('clf-c02/1.1')
    expect(stat).toMatchObject({
      seenCount: 2,
      correctCount: 1,
      lastSeenAt: 2_000,
      lastCorrect: false,
      itemVersion: 2,
    })
  })
})

describe('queries', () => {
  it('lists stats by sub-domain and by cert', async () => {
    await recordAnswer(answer({ itemId: 'clf-c02-1.1-0001' }))
    await recordAnswer(answer({ itemId: 'clf-c02-1.2-0001', subdomainId: 'clf-c02/1.2' }))
    await recordAnswer(
      answer({ itemId: 'aif-c01-1.1-0001', certId: 'aif-c01', subdomainId: 'aif-c01/1.1' }),
    )
    expect((await getStatsForSubdomain('clf-c02/1.2')).map((s) => s.itemId)).toEqual([
      'clf-c02-1.2-0001',
    ])
    expect((await getStatsForCert('clf-c02')).map((s) => s.itemId).sort()).toEqual([
      'clf-c02-1.1-0001',
      'clf-c02-1.2-0001',
    ])
  })
})

describe('recordAnswers', () => {
  /** @param {string} itemId @param {boolean} correct @param {number} at */
  const answer = (itemId, correct, at) => ({
    itemId,
    certId: 'clf-c02',
    subdomainId: 'clf-c02/1.1',
    itemVersion: 1,
    correct,
    at,
  })

  it('records a batch in one go', async () => {
    await recordAnswers([
      answer('clf-c02-1.1-0001', true, 10),
      answer('clf-c02-1.1-0002', false, 20),
    ])
    const rows = await db.itemStats.toArray()
    expect(rows.map((row) => [row.itemId, row.seenCount, row.lastCorrect]).sort()).toEqual([
      ['clf-c02-1.1-0001', 1, true],
      ['clf-c02-1.1-0002', 1, false],
    ])
  })

  it('counts the same item twice when it repeats in a batch', async () => {
    await recordAnswers([
      answer('clf-c02-1.1-0001', true, 10),
      answer('clf-c02-1.1-0001', false, 20),
    ])
    expect(await db.itemStats.get('clf-c02-1.1-0001')).toMatchObject({
      seenCount: 2,
      correctCount: 1,
      lastSeenAt: 20,
      lastCorrect: false,
    })
  })

  it('rolls back with an enclosing transaction', async () => {
    await expect(
      db.transaction('rw', [db.attempts, db.itemStats], async () => {
        await recordAnswers([answer('clf-c02-1.1-0001', true, 10)])
        throw new Error('abort')
      }),
    ).rejects.toThrow('abort')
    expect(await db.itemStats.count()).toBe(0)
  })
})
