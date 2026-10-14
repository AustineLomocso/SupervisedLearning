import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { allocateByWeight, spreadEvenly } from './blueprint.js'
import { createRng } from './rng.js'

const weightsOf = (certId) => getCert(certId).domains.map((domain) => domain.weight)

describe('allocateByWeight', () => {
  it('gives the CLF-C02 exam 16/19/22/8 questions per domain', () => {
    expect(allocateByWeight(65, weightsOf('clf-c02'))).toEqual([16, 19, 22, 8])
  })

  it('gives the AIF-C01 exam 13/16/18/9/9 questions per domain', () => {
    expect(allocateByWeight(65, weightsOf('aif-c01'))).toEqual([13, 16, 18, 9, 9])
  })

  it('always adds up to the total', () => {
    for (const total of [1, 7, 10, 33, 65, 100]) {
      const counts = allocateByWeight(total, weightsOf('clf-c02'))
      expect(counts.reduce((a, b) => a + b, 0)).toBe(total)
    }
  })

  it('treats the weights as relative, so they need not sum to 1', () => {
    expect(allocateByWeight(10, [1, 1])).toEqual([5, 5])
    expect(allocateByWeight(10, [3, 1])).toEqual([8, 2])
  })

  it('gives nothing when the total is zero', () => {
    expect(allocateByWeight(0, [0.5, 0.5])).toEqual([0, 0])
  })
})

describe('spreadEvenly', () => {
  it('splits a count as evenly as possible', () => {
    const counts = spreadEvenly(createRng(1), 30, Array(8).fill(100))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(30)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('never exceeds a capacity and hands the rest to the others', () => {
    expect(spreadEvenly(createRng(1), 12, [2, 10, 10])).toEqual([2, 5, 5])
  })

  it('stops at the total capacity', () => {
    expect(spreadEvenly(createRng(1), 50, [3, 4])).toEqual([3, 4])
  })

  it('varies which entries get the extra one between seeds', () => {
    const firsts = new Set()
    for (let seed = 0; seed < 20; seed += 1) {
      firsts.add(spreadEvenly(createRng(seed), 1, [5, 5, 5]).indexOf(1))
    }
    expect(firsts.size).toBeGreaterThan(1)
  })
})
