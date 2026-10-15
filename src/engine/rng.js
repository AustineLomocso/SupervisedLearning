/**
 * A function returning a pseudo-random number in [0, 1).
 * @typedef {() => number} Rng
 */

/**
 * Small, fast seeded generator (mulberry32). Tests pass a fixed seed so selection is
 * deterministic; the app seeds it with randomSeed().
 * @param {number} seed
 * @returns {Rng}
 */
export function createRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** @returns {number} an unsigned 32-bit integer from the browser's secure random source */
export function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0]
}

/**
 * Fisher–Yates shuffle that returns a new array.
 * @template T
 * @param {Rng} rng
 * @param {readonly T[]} items
 * @returns {T[]}
 */
export function shuffle(rng, items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
