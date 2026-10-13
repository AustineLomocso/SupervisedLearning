import { describe, expect, it } from 'vitest'
import { makeAttempt, makeResult } from '../test/factories.js'
import { deriveSubdomainStatus } from './subdomainStatus.js'

const SUB = 'clf-c02/1.1'
const reviewed = { subdomainId: SUB, certId: 'clf-c02', reviewCompletedAt: 5_000 }

describe('deriveSubdomainStatus', () => {
  it('starts at the Pre-Test', () => {
    expect(deriveSubdomainStatus(SUB, [], undefined)).toEqual({
      pre: { done: false, bestPct: null },
      review: { done: false, completedAt: null },
      post: { done: false, bestPct: null },
      next: 'pre',
    })
  })

  it('keeps the best submitted score and then recommends the review', () => {
    const attempts = [
      makeAttempt({ kind: 'pre', result: makeResult(40) }),
      makeAttempt({ kind: 'pre', result: makeResult(70) }),
      makeAttempt({ kind: 'post', status: 'in_progress', submittedAt: null }),
    ]
    const status = deriveSubdomainStatus(SUB, attempts, undefined)
    expect(status.pre).toEqual({ done: true, bestPct: 70 })
    expect(status.post).toEqual({ done: false, bestPct: null })
    expect(status.next).toBe('review')
  })

  it('ignores other sub-domains and other test kinds', () => {
    const attempts = [
      makeAttempt({ kind: 'pre', scopeId: 'clf-c02/1.2', result: makeResult(90) }),
      makeAttempt({ kind: 'domain', scopeId: 'clf-c02/d1', result: makeResult(90) }),
    ]
    expect(deriveSubdomainStatus(SUB, attempts, undefined).pre.done).toBe(false)
  })

  it('recommends the Post-Test once the lesson is reviewed, even without a Pre-Test', () => {
    const status = deriveSubdomainStatus(SUB, [], reviewed)
    expect(status.review).toEqual({ done: true, completedAt: 5_000 })
    expect(status.next).toBe('post')
  })

  it('recommends nothing once the Post-Test is done', () => {
    const attempts = [makeAttempt({ kind: 'post', result: makeResult(80) })]
    const status = deriveSubdomainStatus(SUB, attempts, undefined)
    expect(status.post).toEqual({ done: true, bestPct: 80 })
    expect(status.next).toBeNull()
  })
})
