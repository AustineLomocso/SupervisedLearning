import { beforeEach, describe, expect, it } from 'vitest'
import { makeItem, makeMultiItem } from '../test/itemFactories.js'
import { resetDb } from '../test/resetDb.js'
import { createAttempt, getAttempt } from './attempts.js'
import { db } from './db.js'
import { finishAttempt, lockAnswer, saveSelection, toggleMarked } from './session.js'

beforeEach(resetDb)

const single = makeItem({ id: 'clf-c02-1.1-0001', taskCode: '1.1' })
const multi = makeMultiItem({ id: 'clf-c02-1.1-0002', taskCode: '1.1' })
const other = makeItem({ id: 'clf-c02-2.1-0003', taskCode: '2.1' })
const ITEMS = [single, multi, other]

/** @param {'study' | 'exam'} [mode] */
function start(mode = 'study') {
  return createAttempt({
    certId: 'clf-c02',
    kind: 'pre',
    scopeId: 'clf-c02/1.1',
    mode,
    itemIds: ITEMS.map((item) => item.id),
    optionOrder: {},
  })
}

describe('lockAnswer', () => {
  it('grades the answer, saves it and records the item history together', async () => {
    const attempt = await start()
    const response = await lockAnswer(attempt.id, single, ['a'], 0, 1_000)
    expect(response).toEqual({
      selected: ['a'],
      submitted: true,
      correct: true,
      markedForReview: false,
      answeredAt: 1_000,
    })
    expect((await getAttempt(attempt.id))?.responses[single.id]).toEqual(response)
    expect(await db.itemStats.get(single.id)).toMatchObject({
      seenCount: 1,
      correctCount: 1,
      lastCorrect: true,
      subdomainId: 'clf-c02/1.1',
      lastSeenAt: 1_000,
    })
  })

  it('records a wrong answer as wrong', async () => {
    const attempt = await start()
    await lockAnswer(attempt.id, multi, ['a', 'b'], 1, 2_000)
    expect(await db.itemStats.get(multi.id)).toMatchObject({ correctCount: 0, lastCorrect: false })
  })

  it('remembers the question the learner is on', async () => {
    const attempt = await start()
    await lockAnswer(attempt.id, multi, ['a', 'c'], 1, 2_000)
    expect((await getAttempt(attempt.id))?.currentIndex).toBe(1)
  })

  it('ignores a second answer to the same question, so history is not counted twice', async () => {
    const attempt = await start()
    await lockAnswer(attempt.id, single, ['a'], 0, 1_000)
    const again = await lockAnswer(attempt.id, single, ['b'], 0, 2_000)
    expect(again.selected).toEqual(['a'])
    expect((await db.itemStats.get(single.id))?.seenCount).toBe(1)
  })

  it('rejects an unknown attempt', async () => {
    await expect(lockAnswer('missing', single, ['a'], 0)).rejects.toThrow('Attempt not found')
  })
})

describe('saveSelection', () => {
  it('stores a changeable, ungraded selection without touching history', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['b'], 0, 1_000)
    await saveSelection(attempt.id, single, ['a'], 0, 2_000)
    expect((await getAttempt(attempt.id))?.responses[single.id]).toEqual({
      selected: ['a'],
      submitted: false,
      correct: null,
      markedForReview: false,
      answeredAt: 2_000,
    })
    expect(await db.itemStats.count()).toBe(0)
  })

  it('has no answer time once the selection is cleared', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    await saveSelection(attempt.id, single, [], 0, 2_000)
    expect((await getAttempt(attempt.id))?.responses[single.id].answeredAt).toBeNull()
  })
})

describe('toggleMarked', () => {
  it('flips the mark and keeps the selection', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    await toggleMarked(attempt.id, single.id, 0)
    expect((await getAttempt(attempt.id))?.responses[single.id]).toMatchObject({
      selected: ['a'],
      markedForReview: true,
    })
    await toggleMarked(attempt.id, single.id, 0)
    expect((await getAttempt(attempt.id))?.responses[single.id].markedForReview).toBe(false)
  })

  it('can mark a question that has no answer yet', async () => {
    const attempt = await start('exam')
    await toggleMarked(attempt.id, other.id, 2)
    expect((await getAttempt(attempt.id))?.responses[other.id]).toEqual({
      selected: [],
      submitted: false,
      correct: null,
      markedForReview: true,
      answeredAt: null,
    })
  })
})

describe('finishAttempt', () => {
  it('in Study mode scores locked answers once and counts unanswered questions as wrong', async () => {
    const attempt = await start('study')
    await lockAnswer(attempt.id, single, ['a'], 0, 1_000)
    const result = await finishAttempt(attempt.id, ITEMS, 9_000)
    expect(result).toMatchObject({ correct: 1, total: 3, pct: 33 })
    expect(result.bySubdomain['clf-c02/1.1']).toEqual({ correct: 1, total: 2 })
    expect(result.byDomain['clf-c02/d2']).toEqual({ correct: 0, total: 1 })
    const stored = await getAttempt(attempt.id)
    expect(stored?.status).toBe('submitted')
    expect(stored?.submittedAt).toBe(9_000)
    expect(stored?.result).toEqual(result)
    expect(stored?.responses[other.id]).toMatchObject({
      selected: [],
      correct: false,
      submitted: true,
    })
    expect((await db.itemStats.get(single.id))?.seenCount).toBe(1)
    expect(await db.itemStats.get(multi.id)).toMatchObject({ seenCount: 1, lastCorrect: false })
    expect(await db.itemStats.count()).toBe(3)
  })

  it('in Exam mode grades everything at the end and records every item', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    await saveSelection(attempt.id, multi, ['a', 'c'], 1, 2_000)
    expect(await db.itemStats.count()).toBe(0)
    const result = await finishAttempt(attempt.id, ITEMS, 9_000)
    expect(result).toMatchObject({ correct: 2, total: 3, pct: 67 })
    expect(await db.itemStats.count()).toBe(3)
    expect((await db.itemStats.get(multi.id))?.lastCorrect).toBe(true)
  })

  it('is safe to call twice', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    const first = await finishAttempt(attempt.id, ITEMS, 9_000)
    const second = await finishAttempt(attempt.id, ITEMS, 10_000)
    expect(second).toEqual(first)
    expect((await getAttempt(attempt.id))?.submittedAt).toBe(9_000)
    expect((await db.itemStats.get(single.id))?.seenCount).toBe(1)
  })

  it('uses the cert’s pass mark for pass/fail', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    expect((await finishAttempt(attempt.id, ITEMS, 9_000)).passed).toBe(false)
  })

  it('rejects an unknown attempt', async () => {
    await expect(finishAttempt('missing', ITEMS)).rejects.toThrow('Attempt not found')
  })
})
