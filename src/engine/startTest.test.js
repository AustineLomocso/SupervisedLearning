import { beforeEach, describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { loadItems } from '../content/loadItems.js'
import { getAttempt } from '../db/attempts.js'
import { recordAnswers } from '../db/itemStats.js'
import { resetDb } from '../test/resetDb.js'
import { createRng } from './rng.js'
import { startTest } from './startTest.js'

beforeEach(resetDb)

const clf = getCert('clf-c02')

describe('startTest', () => {
  it('creates a Study-mode Pre-Test from one task and stores it', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 5,
      mode: 'study',
      rng: createRng(1),
    })
    expect(attempt).toMatchObject({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      status: 'in_progress',
      deadlineAt: null,
    })
    expect(attempt.itemIds).toHaveLength(5)
    expect(attempt.itemIds.every((id) => id.startsWith('clf-c02-1.1-'))).toBe(true)
    expect(await getAttempt(attempt.id)).toEqual(attempt)
  })

  it('stores a shuffled order of every option for each item', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 5,
      mode: 'study',
      rng: createRng(2),
    })
    const items = await loadItems('clf-c02', attempt.itemIds)
    for (const item of items) {
      expect([...attempt.optionOrder[item.id]].sort()).toEqual(item.options.map((o) => o.id).sort())
    }
  })

  it('makes a timed 65-question Diagnostic Exam in Exam mode', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'diagnostic',
      scopeId: 'clf-c02',
      length: 10,
      mode: 'exam',
      rng: createRng(3),
    })
    expect(attempt.itemIds).toHaveLength(65)
    expect(attempt.mode).toBe('exam')
    expect(attempt.deadlineAt).toBe(attempt.startedAt + 90 * 60 * 1000)
  })

  it('has no timer in Study mode', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'full',
      scopeId: 'clf-c02',
      length: 65,
      mode: 'study',
      rng: createRng(4),
    })
    expect(attempt.mode).toBe('study')
    expect(attempt.deadlineAt).toBeNull()
  })

  it('always uses Study mode for tests that are not exams', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'post',
      scopeId: 'clf-c02/1.1',
      length: 10,
      mode: 'exam',
      rng: createRng(5),
    })
    expect(attempt.mode).toBe('study')
    expect(attempt.deadlineAt).toBeNull()
  })

  it('does not repeat Pre-Test questions in the Post-Test while unseen ones remain', async () => {
    const pre = await startTest({
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 10,
      mode: 'study',
      rng: createRng(6),
    })
    await recordAnswers(
      pre.itemIds.map((itemId) => ({
        itemId,
        certId: 'clf-c02',
        subdomainId: 'clf-c02/1.1',
        itemVersion: 1,
        correct: true,
        at: 1_000,
      })),
    )
    const post = await startTest({
      cert: clf,
      kind: 'post',
      scopeId: 'clf-c02/1.1',
      length: 10,
      mode: 'study',
      rng: createRng(7),
    })
    expect(post.itemIds.filter((id) => pre.itemIds.includes(id))).toEqual([])
  })

  it('builds a Weak-Area Drill', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'drill',
      scopeId: 'clf-c02',
      length: 10,
      mode: 'study',
      rng: createRng(8),
    })
    expect(attempt.itemIds).toHaveLength(10)
    expect(new Set(attempt.itemIds).size).toBe(10)
  })
})
