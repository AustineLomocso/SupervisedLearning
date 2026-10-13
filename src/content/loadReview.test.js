import { describe, expect, it } from 'vitest'
import { createReviewLoader } from './loadReview.js'

describe('createReviewLoader', () => {
  const loadReview = createReviewLoader({
    '/content/tst-c01/review/1.1.md': async () => '# Lesson 1.1',
  })

  it('returns the lesson markdown', async () => {
    expect(await loadReview('tst-c01', '1.1')).toBe('# Lesson 1.1')
  })

  it('rejects when the lesson does not exist', async () => {
    await expect(loadReview('tst-c01', '1.2')).rejects.toThrow('No review lesson for tst-c01 1.2')
  })
})
