import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { parseItemId } from '../content/ids.js'
import { selectDrill } from './drill.js'
import { createRng } from './rng.js'

const clf = getCert('clf-c02')

/** @param {number} [perTask] */
function makePools(perTask = 30) {
  /** @type {Record<string, string[]>} */
  const pools = {}
  for (const domain of clf.domains) {
    for (const sub of domain.subdomains) {
      pools[sub.code] = Array.from(
        { length: perTask },
        (_, i) => `clf-c02-${sub.code}-${String(i + 1).padStart(4, '0')}`,
      )
    }
  }
  return pools
}

/** @param {Record<string, { lastSeenAt: number, lastCorrect: boolean }>} rows */
const statsOf = (rows) =>
  new Map(Object.entries(rows).map(([itemId, row]) => [itemId, { itemId, ...row }]))

/** @param {number} pct */
const strength = (pct) => ({ answered: 20, correct: pct / 5, pct, band: 'x', lowConfidence: false })

/** @param {Record<string, number>} pctByTask others default to 100 */
function masteryOf(pctByTask) {
  const map = new Map()
  for (const domain of clf.domains) {
    for (const sub of domain.subdomains) map.set(sub.id, strength(pctByTask[sub.code] ?? 100))
  }
  return map
}

const taskOf = (id) => parseItemId(id).taskCode

describe('selectDrill', () => {
  it('takes about half from previously missed questions', () => {
    const pools = makePools()
    const missed = pools['2.1'].slice(0, 12)
    const stats = statsOf(
      Object.fromEntries(missed.map((id) => [id, { lastSeenAt: 1, lastCorrect: false }])),
    )
    const picked = selectDrill({
      rng: createRng(1),
      cert: clf,
      length: 10,
      pools,
      stats,
      mastery: masteryOf({}),
    })
    expect(picked).toHaveLength(10)
    expect(new Set(picked).size).toBe(10)
    expect(picked.filter((id) => missed.includes(id))).toHaveLength(5)
  })

  it('uses fewer missed questions when fewer exist and fills from weak areas', () => {
    const pools = makePools()
    const missed = pools['2.1'].slice(0, 2)
    const stats = statsOf(
      Object.fromEntries(missed.map((id) => [id, { lastSeenAt: 1, lastCorrect: false }])),
    )
    const picked = selectDrill({
      rng: createRng(1),
      cert: clf,
      length: 10,
      pools,
      stats,
      mastery: masteryOf({ 1.1: 0 }),
    })
    expect(picked.filter((id) => missed.includes(id))).toHaveLength(2)
    expect(picked.filter((id) => taskOf(id) === '1.1')).toHaveLength(8)
  })

  it('focuses the rest on the weakest task', () => {
    const picked = selectDrill({
      rng: createRng(2),
      cert: clf,
      length: 10,
      pools: makePools(),
      stats: new Map(),
      mastery: masteryOf({ 3.4: 0 }),
    })
    expect(picked.every((id) => taskOf(id) === '3.4')).toBe(true)
  })

  it('treats a task with no answers as the weakest', () => {
    const mastery = masteryOf({})
    mastery.delete('clf-c02/2.3')
    const picked = selectDrill({
      rng: createRng(2),
      cert: clf,
      length: 10,
      pools: makePools(),
      stats: new Map(),
      mastery,
    })
    expect(picked.every((id) => taskOf(id) === '2.3')).toBe(true)
  })

  it('falls back to domain weights when everything is mastered', () => {
    const picked = selectDrill({
      rng: createRng(3),
      cert: clf,
      length: 20,
      pools: makePools(),
      stats: new Map(),
      mastery: masteryOf({}),
    })
    expect(picked).toHaveLength(20)
    expect(new Set(picked).size).toBe(20)
  })

  it('tops up from other tasks when the weakest has too few questions', () => {
    const pools = makePools()
    pools['1.1'] = pools['1.1'].slice(0, 3)
    const picked = selectDrill({
      rng: createRng(5),
      cert: clf,
      length: 10,
      pools,
      stats: new Map(),
      mastery: masteryOf({ 1.1: 0 }),
    })
    expect(picked).toHaveLength(10)
    expect(picked.filter((id) => taskOf(id) === '1.1')).toHaveLength(3)
  })

  it('is deterministic for a seed', () => {
    const args = {
      cert: clf,
      length: 10,
      pools: makePools(),
      stats: new Map(),
      mastery: masteryOf({ 4.1: 10 }),
    }
    expect(selectDrill({ rng: createRng(7), ...args })).toEqual(
      selectDrill({ rng: createRng(7), ...args }),
    )
  })
})
