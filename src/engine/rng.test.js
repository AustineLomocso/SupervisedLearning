import { describe, expect, it } from 'vitest'
import { createRng, randomSeed, shuffle } from './rng.js'

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('differs between seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i += 1) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  const input = Array.from({ length: 20 }, (_, i) => i)

  it('keeps every element and leaves the input untouched', () => {
    const copy = [...input]
    const result = shuffle(createRng(3), input)
    expect([...result].sort((a, b) => a - b)).toEqual(input)
    expect(input).toEqual(copy)
  })

  it('is deterministic for a seed and actually reorders', () => {
    expect(shuffle(createRng(5), input)).toEqual(shuffle(createRng(5), input))
    expect(shuffle(createRng(5), input)).not.toEqual(input)
  })
})

describe('randomSeed', () => {
  it('returns an unsigned 32-bit integer', () => {
    const seed = randomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})
