// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { STEMS } from '../__fixtures__/contentBuilders.mjs'
import { NEAR_DUPLICATE_THRESHOLD, stemSimilarity } from './similarity.mjs'

const LONG_STEM =
  'Which AWS service provides durable object storage for any amount of data in the cloud?'

describe('stemSimilarity', () => {
  it('is 1 for the same text, ignoring case and punctuation', () => {
    expect(stemSimilarity('Which AWS service?', 'which aws service')).toBe(1)
  })

  it('reaches the near-duplicate threshold for a one-word change', () => {
    expect(stemSimilarity(LONG_STEM, `${LONG_STEM} today`)).toBeGreaterThanOrEqual(
      NEAR_DUPLICATE_THRESHOLD,
    )
  })

  it('is low for unrelated stems', () => {
    expect(stemSimilarity(STEMS[0], STEMS[3])).toBeLessThan(0.4)
  })

  it('keeps every fixture stem below the threshold', () => {
    for (let a = 0; a < STEMS.length; a++) {
      for (let b = a + 1; b < STEMS.length; b++) {
        expect(stemSimilarity(STEMS[a], STEMS[b])).toBeLessThan(NEAR_DUPLICATE_THRESHOLD)
      }
    }
  })
})
