import { shuffle } from './rng.js'

/** @typedef {import('./rng.js').Rng} Rng */

/**
 * Largest-remainder allocation: whole numbers proportional to `weights` that add up to
 * exactly `total`. Ties go to the earlier entry.
 * @param {number} total
 * @param {number[]} weights relative weights (need not sum to 1)
 * @returns {number[]}
 */
export function allocateByWeight(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0)
  const exact = weights.map((weight) => (weight / sum) * total)
  const counts = exact.map(Math.floor)
  let left = total - counts.reduce((a, b) => a + b, 0)
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of byRemainder) {
    if (left <= 0) break
    counts[index] += 1
    left -= 1
  }
  return counts
}

/**
 * Deals `count` out one at a time across entries, skipping any that are full. The order
 * entries are visited in is shuffled, so the entries that get the extra one vary.
 * @param {Rng} rng
 * @param {number} count
 * @param {number[]} capacities how many each entry can take
 * @returns {number[]} how many each entry gets; sums to min(count, total capacity)
 */
export function spreadEvenly(rng, count, capacities) {
  const counts = capacities.map(() => 0)
  const order = shuffle(
    rng,
    capacities.map((_, index) => index),
  )
  let left = Math.min(
    count,
    capacities.reduce((a, b) => a + b, 0),
  )
  while (left > 0) {
    for (const index of order) {
      if (left <= 0) break
      if (counts[index] < capacities[index]) {
        counts[index] += 1
        left -= 1
      }
    }
  }
  return counts
}
