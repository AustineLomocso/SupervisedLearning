import { describe, expect, it } from 'vitest'
import { LruCache } from './lru.js'

describe('LruCache', () => {
  it('returns stored values and undefined for missing keys', () => {
    const cache = new LruCache(2)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
  })

  it('evicts the least recently used entry when full', () => {
    const cache = new LruCache(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a')
    cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
  })

  it('deletes entries and reports its size', () => {
    const cache = new LruCache(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.delete('a')
    expect(cache.size).toBe(1)
    expect(cache.get('a')).toBeUndefined()
  })

  it('rejects a capacity below 1', () => {
    expect(() => new LruCache(0)).toThrow(RangeError)
  })
})
