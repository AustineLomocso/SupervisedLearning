// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MIN_SPREAD_SIZE, objectiveSpreadIssues } from './objectives.mjs'

/**
 * @param {number[]} counts how many items per objective index
 * @param {number} [untagged] extra items with no objective tag
 */
function itemsFor(counts, untagged = 0) {
  const items = counts.flatMap((count, objective) =>
    Array.from({ length: count }, () => ({ objective })),
  )
  return [...items, ...Array.from({ length: untagged }, () => ({}))]
}

describe('objectiveSpreadIssues', () => {
  it('says nothing about a task that has no tags yet', () => {
    expect(objectiveSpreadIssues(itemsFor([], 20), 3)).toEqual([])
  })

  it('accepts a balanced task', () => {
    expect(objectiveSpreadIssues(itemsFor([17, 17, 16]), 3)).toEqual([])
  })

  it('flags untagged items once any item is tagged', () => {
    expect(objectiveSpreadIssues(itemsFor([10, 10], 3), 2)).toEqual([
      '3 active items have no objective tag',
    ])
  })

  it('does not judge the spread until the task is large enough', () => {
    expect(MIN_SPREAD_SIZE).toBe(40)
    expect(objectiveSpreadIssues(itemsFor([30, 1, 0]), 3)).toEqual([])
  })

  it('flags an objective with fewer than 2 questions', () => {
    expect(objectiveSpreadIssues(itemsFor([12, 12, 12, 12, 1]), 5)).toEqual([
      'objective 4 has 1 question; every objective needs at least 2',
    ])
  })

  it('flags an objective with no questions', () => {
    expect(objectiveSpreadIssues(itemsFor([13, 13, 12, 12, 0]), 5)).toEqual([
      'objective 4 has 0 questions; every objective needs at least 2',
    ])
  })

  it('flags an objective that takes more than 40% of the task', () => {
    expect(objectiveSpreadIssues(itemsFor([21, 15, 14]), 3)).toEqual([
      'objective 0 has 21 of 50 questions (42%); keep it to 40% or less',
    ])
  })

  it('accepts an objective at exactly 40%', () => {
    expect(objectiveSpreadIssues(itemsFor([20, 15, 15]), 3)).toEqual([])
  })
})
