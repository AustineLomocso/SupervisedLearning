import { describe, expect, it } from 'vitest'
import { makeItem, makeMultiItem } from '../test/itemFactories.js'
import { buildResult, finalizeResponses, isCorrect, scoreAttempt } from './grading.js'

const response = (selected, extra = {}) => ({
  selected,
  submitted: true,
  correct: null,
  markedForReview: false,
  answeredAt: 5,
  ...extra,
})

describe('isCorrect', () => {
  it('accepts the right single answer and rejects a wrong or empty one', () => {
    const item = makeItem()
    expect(isCorrect(item, ['a'])).toBe(true)
    expect(isCorrect(item, ['b'])).toBe(false)
    expect(isCorrect(item, [])).toBe(false)
  })

  it('is all-or-nothing for multiple response', () => {
    const item = makeMultiItem()
    expect(isCorrect(item, ['a', 'c'])).toBe(true)
    expect(isCorrect(item, ['c', 'a'])).toBe(true)
    expect(isCorrect(item, ['a'])).toBe(false)
    expect(isCorrect(item, ['a', 'b'])).toBe(false)
    expect(isCorrect(item, ['a', 'c', 'd'])).toBe(false)
    expect(isCorrect(item, [])).toBe(false)
  })

  it('ignores duplicate ids in the selection', () => {
    expect(isCorrect(makeMultiItem(), ['a', 'a'])).toBe(false)
    expect(isCorrect(makeMultiItem(), ['a', 'c', 'c'])).toBe(true)
  })
})

describe('finalizeResponses', () => {
  const single = makeItem({ id: 'clf-c02-1.1-0001' })
  const multi = makeMultiItem({ id: 'clf-c02-2.1-0002', taskCode: '2.1' })
  const skipped = makeItem({ id: 'clf-c02-3.1-0003', taskCode: '3.1' })

  it('grades answers, keeps marks, and treats unanswered questions as wrong', () => {
    const result = finalizeResponses(
      [single, multi, skipped],
      {
        [single.id]: response(['a'], { markedForReview: true, answeredAt: 11 }),
        [multi.id]: response(['a', 'b']),
      },
      99,
    )
    expect(result[single.id]).toEqual({
      selected: ['a'],
      submitted: true,
      correct: true,
      markedForReview: true,
      answeredAt: 11,
    })
    expect(result[multi.id].correct).toBe(false)
    expect(result[skipped.id]).toEqual({
      selected: [],
      submitted: true,
      correct: false,
      markedForReview: false,
      answeredAt: 99,
    })
  })

  it('gives a deselected exam answer a timestamp so mastery can count it', () => {
    const result = finalizeResponses(
      [single],
      { [single.id]: response([], { answeredAt: null }) },
      50,
    )
    expect(result[single.id].answeredAt).toBe(50)
  })
})

describe('scoreAttempt', () => {
  const ids = ['clf-c02-1.1-0001', 'clf-c02-1.2-0002', 'clf-c02-2.1-0003', 'clf-c02-2.1-0004']

  it('counts right answers overall and by domain and sub-domain', () => {
    const responses = {
      'clf-c02-1.1-0001': response(['a'], { correct: true }),
      'clf-c02-1.2-0002': response(['b'], { correct: false }),
      'clf-c02-2.1-0003': response(['a'], { correct: true }),
    }
    expect(scoreAttempt(ids, responses)).toEqual({
      correct: 2,
      total: 4,
      pct: 50,
      byDomain: {
        'clf-c02/d1': { correct: 1, total: 2 },
        'clf-c02/d2': { correct: 1, total: 2 },
      },
      bySubdomain: {
        'clf-c02/1.1': { correct: 1, total: 1 },
        'clf-c02/1.2': { correct: 0, total: 1 },
        'clf-c02/2.1': { correct: 1, total: 2 },
      },
    })
  })

  it('scores an empty attempt as 0%', () => {
    expect(scoreAttempt([], {}).pct).toBe(0)
  })
})

describe('buildResult', () => {
  it('adds the scaled estimate and pass flag', () => {
    const ids = Array.from(
      { length: 10 },
      (_, i) => `clf-c02-1.1-${String(i + 1).padStart(4, '0')}`,
    )
    const responses = Object.fromEntries(
      ids.map((id, i) => [id, response(['a'], { correct: i < 7 })]),
    )
    const result = buildResult(ids, responses)
    expect(result).toMatchObject({
      correct: 7,
      total: 10,
      pct: 70,
      scaledEstimate: 700,
      passed: true,
    })
    const worse = buildResult(ids, { ...responses, [ids[0]]: response(['b'], { correct: false }) })
    expect(worse).toMatchObject({ pct: 60, passed: false })
  })
})
