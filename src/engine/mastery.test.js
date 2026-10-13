import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { graded, makeAttempt } from '../test/factories.js'
import {
  collectAnswers,
  LOW_CONFIDENCE_BELOW,
  MASTERY_WINDOW,
  masteryBand,
  masteryBySubdomain,
  NO_MASTERY,
  poolMastery,
  recommendNext,
} from './mastery.js'

/**
 * @param {string} subdomainId
 * @param {boolean[]} results oldest first
 */
function answers(subdomainId, results) {
  return results.map((correct, i) => ({
    itemId: `${subdomainId}#${i}`,
    subdomainId,
    correct,
    answeredAt: 1_000 + i,
  }))
}

const STRONG = { answered: 20, correct: 20, pct: 100, band: 'strong', lowConfidence: false }

describe('collectAnswers', () => {
  it('flattens graded responses and tags each with its sub-domain', () => {
    const attempt = makeAttempt({
      responses: {
        'clf-c02-1.1-0001': graded(true, 10),
        'clf-c02-2.3-0004': graded(false, 20),
        'clf-c02-1.1-0002': {
          selected: ['a'],
          submitted: false,
          correct: null,
          markedForReview: true,
          answeredAt: 30,
        },
      },
    })
    expect(collectAnswers([attempt])).toEqual([
      { itemId: 'clf-c02-1.1-0001', subdomainId: 'clf-c02/1.1', correct: true, answeredAt: 10 },
      { itemId: 'clf-c02-2.3-0004', subdomainId: 'clf-c02/2.3', correct: false, answeredAt: 20 },
    ])
  })

  it('skips answers without a timestamp and unrecognised item ids', () => {
    const attempt = makeAttempt({
      responses: { 'clf-c02-1.1-0001': graded(true, null), 'not-an-id': graded(true, 5) },
    })
    expect(collectAnswers([attempt])).toEqual([])
  })
})

describe('masteryBand', () => {
  it.each([
    [null, 'not-started'],
    [0, 'weak'],
    [49, 'weak'],
    [50, 'developing'],
    [74, 'developing'],
    [75, 'strong'],
    [100, 'strong'],
  ])('%s%% is %s', (pct, band) => {
    expect(masteryBand(pct)).toBe(band)
  })
})

describe('masteryBySubdomain', () => {
  it('scores only the most recent answers', () => {
    const results = [...Array(5).fill(false), ...Array(MASTERY_WINDOW).fill(true)]
    expect(masteryBySubdomain(answers('clf-c02/1.1', results)).get('clf-c02/1.1')).toEqual(STRONG)
  })

  it('uses answer time, not input order, to find the most recent answers', () => {
    const results = [...Array(5).fill(false), ...Array(MASTERY_WINDOW).fill(true)]
    const shuffled = answers('clf-c02/1.1', results).reverse()
    expect(masteryBySubdomain(shuffled).get('clf-c02/1.1')?.pct).toBe(100)
  })

  it('flags fewer than five answers as low confidence', () => {
    const few = answers('clf-c02/1.1', [true, false, true, false])
    expect(few).toHaveLength(LOW_CONFIDENCE_BELOW - 1)
    expect(masteryBySubdomain(few).get('clf-c02/1.1')).toEqual({
      answered: 4,
      correct: 2,
      pct: 50,
      band: 'developing',
      lowConfidence: true,
    })
    const enough = answers('clf-c02/1.1', [true, false, true, false, true])
    expect(masteryBySubdomain(enough).get('clf-c02/1.1')?.lowConfidence).toBe(false)
  })

  it('keeps sub-domains apart and leaves out untouched ones', () => {
    const result = masteryBySubdomain([
      ...answers('clf-c02/1.1', [true]),
      ...answers('clf-c02/2.1', [false]),
    ])
    expect([...result.keys()].sort()).toEqual(['clf-c02/1.1', 'clf-c02/2.1'])
    expect(result.get('clf-c02/2.1')?.band).toBe('weak')
  })
})

describe('poolMastery', () => {
  it('pools answers across sub-domains', () => {
    const half = { answered: 4, correct: 2, pct: 50, band: 'developing', lowConfidence: true }
    expect(poolMastery([STRONG, half, NO_MASTERY])).toEqual({ pct: 92, practiced: 2 })
  })

  it('is null when nothing has been answered', () => {
    expect(poolMastery([NO_MASTERY, NO_MASTERY])).toEqual({ pct: null, practiced: 0 })
  })
})

describe('recommendNext', () => {
  const cert = getCert('clf-c02')

  it('ranks untouched tasks by domain weight, keeping blueprint order on ties', () => {
    expect(recommendNext(cert, new Map()).map((r) => r.subdomain.code)).toEqual([
      '3.1',
      '3.2',
      '3.3',
    ])
  })

  it('weighs low mastery against the domain weight', () => {
    const mastery = new Map(cert.domains[2].subdomains.map((sub) => [sub.id, STRONG]))
    mastery.set('clf-c02/3.5', {
      answered: 10,
      correct: 2,
      pct: 20,
      band: 'weak',
      lowConfidence: false,
    })
    // 3.5: 0.8 × 0.34 = 0.272 sits between domain 2 (0.30) and domain 1 (0.24).
    expect(recommendNext(cert, mastery, 6).map((r) => r.subdomain.code)).toEqual([
      '2.1',
      '2.2',
      '2.3',
      '2.4',
      '3.5',
      '1.1',
    ])
  })
})
