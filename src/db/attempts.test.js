import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import {
  createAttempt,
  getAttempt,
  listAttempts,
  listInProgress,
  saveResponse,
  submitAttempt,
} from './attempts.js'

const ITEM_1 = 'clf-c02-1.1-0001'
const ITEM_2 = 'clf-c02-1.1-0002'

/** @param {object} [overrides] */
const newAttempt = (overrides = {}) => ({
  certId: 'clf-c02',
  kind: 'pre',
  scopeId: 'clf-c02/1.1',
  mode: 'study',
  itemIds: [ITEM_1, ITEM_2],
  optionOrder: { [ITEM_1]: ['b', 'a', 'd', 'c'], [ITEM_2]: ['a', 'c', 'b', 'd'] },
  ...overrides,
})

const response = {
  selected: ['a'],
  submitted: true,
  correct: true,
  markedForReview: false,
  answeredAt: 2_000,
}

const result = {
  correct: 1,
  total: 2,
  pct: 50,
  scaledEstimate: 529,
  passed: false,
  byDomain: { 'clf-c02/d1': { correct: 1, total: 2 } },
  bySubdomain: { 'clf-c02/1.1': { correct: 1, total: 2 } },
}

beforeEach(resetDb)

describe('createAttempt', () => {
  it('stores a new in-progress attempt with no responses', async () => {
    const attempt = await createAttempt(newAttempt(), 1_000)
    expect(await getAttempt(attempt.id)).toEqual({
      ...newAttempt(),
      id: attempt.id,
      status: 'in_progress',
      startedAt: 1_000,
      deadlineAt: null,
      submittedAt: null,
      responses: {},
      currentIndex: 0,
      result: null,
    })
  })

  it('sets an absolute deadline when a time limit is given', async () => {
    const attempt = await createAttempt(
      newAttempt({ kind: 'full', mode: 'exam', timeLimitSec: 5_400 }),
      1_000,
    )
    expect(attempt.deadlineAt).toBe(1_000 + 5_400_000)
  })
})

describe('saveResponse', () => {
  it('records a response for an item id containing dots and moves the position', async () => {
    const { id } = await createAttempt(newAttempt())
    await saveResponse(id, ITEM_1, response, 1)
    const stored = await getAttempt(id)
    expect(stored?.responses[ITEM_1]).toEqual(response)
    expect(stored?.currentIndex).toBe(1)
  })

  it('throws for an unknown attempt', async () => {
    await expect(saveResponse('missing', ITEM_1, response, 0)).rejects.toThrow(
      'Attempt not found: missing',
    )
  })
})

describe('submitAttempt', () => {
  it('marks the attempt submitted with its result', async () => {
    const { id } = await createAttempt(newAttempt(), 1_000)
    await submitAttempt(id, result, 9_000)
    expect(await getAttempt(id)).toMatchObject({ status: 'submitted', submittedAt: 9_000, result })
  })

  it('throws for an unknown attempt', async () => {
    await expect(submitAttempt('missing', result)).rejects.toThrow('Attempt not found: missing')
  })
})

describe('listAttempts', () => {
  it("returns a cert's attempts newest first, filtered by kind and status", async () => {
    const older = await createAttempt(newAttempt({ kind: 'pre' }), 1_000)
    const newer = await createAttempt(newAttempt({ kind: 'post' }), 2_000)
    await createAttempt(newAttempt({ certId: 'aif-c01', scopeId: 'aif-c01/1.1' }), 3_000)

    expect((await listAttempts('clf-c02')).map((a) => a.id)).toEqual([newer.id, older.id])
    expect((await listAttempts('clf-c02', { kind: 'pre' })).map((a) => a.id)).toEqual([older.id])

    await submitAttempt(older.id, result, 4_000)
    expect((await listInProgress('clf-c02')).map((a) => a.id)).toEqual([newer.id])
    expect((await listAttempts('clf-c02', { status: 'submitted' })).map((a) => a.id)).toEqual([
      older.id,
    ])
  })
})
