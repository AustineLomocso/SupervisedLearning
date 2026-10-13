/**
 * Least-recently-used cache. Reading or writing a key makes it the most recent; the
 * oldest key is dropped once `capacity` is exceeded.
 * @template K, V
 */
export class LruCache {
  /** @param {number} capacity */
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError('capacity must be a positive integer')
    }
    this.capacity = capacity
    /** @type {Map<K, V>} */
    this.entries = new Map()
  }

  /**
   * @param {K} key
   * @returns {V | undefined}
   */
  get(key) {
    if (!this.entries.has(key)) return undefined
    const value = /** @type {V} */ (this.entries.get(key))
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  /**
   * @param {K} key
   * @param {V} value
   */
  set(key, value) {
    this.entries.delete(key)
    this.entries.set(key, value)
    if (this.entries.size > this.capacity) {
      this.entries.delete(/** @type {K} */ (this.entries.keys().next().value))
    }
  }

  /** @param {K} key */
  delete(key) {
    this.entries.delete(key)
  }

  get size() {
    return this.entries.size
  }
}
