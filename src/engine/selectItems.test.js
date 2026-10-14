import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { parseItemId } from '../content/ids.js'
import { createRng } from './rng.js'
import { pickUnseenFirst, selectForTest } from './selectItems.js'

/** @param {string} certId @param {number} [perTask] */
function makePools(certId, perTask = 30) {
  const cert = getCert(certId)
  /** @type {Record<string, string[]>} */
  const pools = {}
  for (const domain of cert.domains) {
    for (const sub of domain.subdomains) {
      pools[sub.code] = Array.from(
        { length: perTask },
        (_, i) => `${certId}-${sub.code}-${String(i + 1).padStart(4, '0')}`,
      )
    }
  }
  return pools
}

/** @param {Record<string, number>} seen item id → lastSeenAt */
const statsOf = (seen) =>
  new Map(Object.entries(seen).map(([itemId, lastSeenAt]) => [itemId, { itemId, lastSeenAt }]))

const domainOf = (id) => Number(parseItemId(id).taskCode.split('.')[0])

/** @param {string[]} ids */
function countByDomain(ids) {
  /** @type {Record<number, number>} */
  const counts = {}
  for (const id of ids) counts[domainOf(id)] = (counts[domainOf(id)] ?? 0) + 1
  return counts
}

describe('pickUnseenFirst', () => {
  const ids = Array.from({ length: 10 }, (_, i) => `x-${i}`)

  it('prefers unseen ids', () => {
    const stats = statsOf({ 'x-0': 1, 'x-1': 2, 'x-2': 3 })
    const picked = pickUnseenFirst(createRng(1), ids, 7, stats)
    expect(picked.sort()).toEqual(['x-3', 'x-4', 'x-5', 'x-6', 'x-7', 'x-8', 'x-9'])
  })

  it('then fills with the least recently seen', () => {
    const stats = statsOf(Object.fromEntries(ids.map((id, i) => [id, 100 - i])))
    // Everything is seen; x-9 was seen longest ago (lastSeenAt 91), then x-8, x-7.
    expect(pickUnseenFirst(createRng(1), ids, 3, stats)).toEqual(['x-9', 'x-8', 'x-7'])
  })

  it('never repeats an id and skips excluded ones', () => {
    const picked = pickUnseenFirst(createRng(1), ids, 10, new Map(), new Set(['x-0', 'x-1']))
    expect(new Set(picked).size).toBe(8)
    expect(picked).not.toContain('x-0')
  })

  it('returns fewer when the pool is short', () => {
    expect(pickUnseenFirst(createRng(1), ids, 99, new Map())).toHaveLength(10)
  })
})

describe('selectForTest', () => {
  const clf = getCert('clf-c02')
  const aif = getCert('aif-c01')

  it('picks Pre-Test questions from one task, unseen first', () => {
    const pools = makePools('clf-c02')
    const seen = Object.fromEntries(pools['1.1'].slice(0, 25).map((id, i) => [id, i + 1]))
    const picked = selectForTest({
      rng: createRng(1),
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 10,
      pools,
      stats: statsOf(seen),
    })
    expect(picked).toHaveLength(10)
    expect(new Set(picked).size).toBe(10)
    expect(picked.every((id) => pools['1.1'].includes(id))).toBe(true)
    // 5 unseen (0026–0030) + the 5 least recently seen (0001–0005).
    expect(picked.sort()).toEqual([...pools['1.1'].slice(25), ...pools['1.1'].slice(0, 5)].sort())
  })

  it('does not repeat Pre-Test questions in the Post-Test while unseen ones remain', () => {
    const pools = makePools('clf-c02', 20)
    const args = { cert: clf, scopeId: 'clf-c02/1.1', length: 10, pools }
    const pre = selectForTest({ rng: createRng(1), kind: 'pre', stats: new Map(), ...args })
    const stats = statsOf(Object.fromEntries(pre.map((id) => [id, 1])))
    const post = selectForTest({ rng: createRng(2), kind: 'post', stats, ...args })
    expect(post.filter((id) => pre.includes(id))).toEqual([])
  })

  it('spreads a Domain Assessment evenly across the domain’s tasks', () => {
    const pools = makePools('clf-c02')
    const picked = selectForTest({
      rng: createRng(1),
      cert: clf,
      kind: 'domain',
      scopeId: 'clf-c02/d3',
      length: 30,
      pools,
      stats: new Map(),
    })
    expect(picked).toHaveLength(30)
    const perTask = {}
    for (const id of picked)
      perTask[parseItemId(id).taskCode] = (perTask[parseItemId(id).taskCode] ?? 0) + 1
    expect(Object.keys(perTask).sort()).toEqual([
      '3.1',
      '3.2',
      '3.3',
      '3.4',
      '3.5',
      '3.6',
      '3.7',
      '3.8',
    ])
    expect(
      Math.max(...Object.values(perTask)) - Math.min(...Object.values(perTask)),
    ).toBeLessThanOrEqual(1)
  })

  it.each([
    ['clf-c02', clf, { 1: 16, 2: 19, 3: 22, 4: 8 }],
    ['aif-c01', aif, { 1: 13, 2: 16, 3: 18, 4: 9, 5: 9 }],
  ])('follows the %s exam blueprint for a 65-question exam', (certId, cert, expected) => {
    for (const kind of ['diagnostic', 'full']) {
      const picked = selectForTest({
        rng: createRng(9),
        cert,
        kind,
        scopeId: certId,
        length: 65,
        pools: makePools(certId),
        stats: new Map(),
      })
      expect(picked).toHaveLength(65)
      expect(new Set(picked).size).toBe(65)
      expect(countByDomain(picked)).toEqual(expected)
    }
  })

  it('tops up from other domains when one domain cannot fill its share', () => {
    const pools = makePools('clf-c02')
    for (const code of ['4.1', '4.2', '4.3']) pools[code] = pools[code].slice(0, 1)
    const picked = selectForTest({
      rng: createRng(4),
      cert: clf,
      kind: 'full',
      scopeId: 'clf-c02',
      length: 65,
      pools,
      stats: new Map(),
    })
    expect(picked).toHaveLength(65)
    expect(new Set(picked).size).toBe(65)
    expect(countByDomain(picked)[4]).toBe(3)
  })

  it('only returns ids that are in the pools (so retired ids, which are not in them, never appear)', () => {
    const pools = makePools('clf-c02', 12)
    const all = new Set(Object.values(pools).flat())
    const picked = selectForTest({
      rng: createRng(8),
      cert: clf,
      kind: 'full',
      scopeId: 'clf-c02',
      length: 65,
      pools,
      stats: new Map(),
    })
    expect(picked.every((id) => all.has(id))).toBe(true)
  })

  it('is deterministic for a seed', () => {
    const args = {
      cert: clf,
      kind: 'full',
      scopeId: 'clf-c02',
      length: 65,
      pools: makePools('clf-c02'),
      stats: new Map(),
    }
    expect(selectForTest({ rng: createRng(11), ...args })).toEqual(
      selectForTest({ rng: createRng(11), ...args }),
    )
  })
})
