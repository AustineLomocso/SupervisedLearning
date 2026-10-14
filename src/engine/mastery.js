import { parseItemId, subdomainId } from '../content/ids.js'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../content/certs.js').DomainSummary} DomainSummary */
/** @typedef {import('../content/certs.js').SubdomainSummary} SubdomainSummary */

/** Mastery looks at this many of the most recent answers in a sub-domain. */
export const MASTERY_WINDOW = 20

/** Fewer answers than this are flagged as low confidence. */
export const LOW_CONFIDENCE_BELOW = 5

/** @typedef {'not-started' | 'weak' | 'developing' | 'strong'} MasteryBand */

/**
 * One graded answer, flattened out of an attempt.
 * @typedef {object} Answer
 * @property {string} itemId
 * @property {string} subdomainId
 * @property {boolean} correct
 * @property {number} answeredAt epoch ms
 */

/**
 * @typedef {object} Mastery
 * @property {number} answered answers counted, at most MASTERY_WINDOW
 * @property {number} correct
 * @property {number | null} pct whole percent; null when nothing has been answered
 * @property {MasteryBand} band
 * @property {boolean} lowConfidence true for 1 to LOW_CONFIDENCE_BELOW - 1 answers
 */

/**
 * @typedef {object} Recommendation
 * @property {SubdomainSummary} subdomain
 * @property {DomainSummary} domain
 * @property {Mastery} mastery
 * @property {number} priority (1 − mastery) × domain weight
 */

/** @type {Mastery} */
export const NO_MASTERY = {
  answered: 0,
  correct: 0,
  pct: null,
  band: 'not-started',
  lowConfidence: false,
}

/**
 * Every graded answer across attempts. Responses that are not graded yet (exam mode before
 * submit) have `correct: null` and are skipped.
 * @param {Attempt[]} attempts
 * @returns {Answer[]}
 */
export function collectAnswers(attempts) {
  return attempts.flatMap((attempt) =>
    Object.entries(attempt.responses).flatMap(([itemId, response]) => {
      const parsed = parseItemId(itemId)
      if (!parsed || typeof response.correct !== 'boolean' || response.answeredAt === null) {
        return []
      }
      return [
        {
          itemId,
          subdomainId: subdomainId(parsed.certId, parsed.taskCode),
          correct: response.correct,
          answeredAt: response.answeredAt,
        },
      ]
    }),
  )
}

/**
 * @param {number | null} pct whole percent
 * @returns {MasteryBand}
 */
export function masteryBand(pct) {
  if (pct === null) return 'not-started'
  if (pct < 50) return 'weak'
  if (pct < 75) return 'developing'
  return 'strong'
}

/**
 * Accuracy over the most recent MASTERY_WINDOW answers in each sub-domain.
 * @param {Answer[]} answers
 * @returns {Map<string, Mastery>} keyed by sub-domain id; untouched sub-domains are absent
 */
export function masteryBySubdomain(answers) {
  /** @type {Map<string, Answer[]>} */
  const groups = new Map()
  for (const answer of answers) {
    const group = groups.get(answer.subdomainId)
    if (group) group.push(answer)
    else groups.set(answer.subdomainId, [answer])
  }

  /** @type {Map<string, Mastery>} */
  const result = new Map()
  for (const [id, group] of groups) {
    const recent = [...group].sort((a, b) => b.answeredAt - a.answeredAt).slice(0, MASTERY_WINDOW)
    const correct = recent.filter((answer) => answer.correct).length
    // Band from the rounded percent, so the label always matches the number shown.
    const pct = Math.round((correct / recent.length) * 100)
    result.set(id, {
      answered: recent.length,
      correct,
      pct,
      band: masteryBand(pct),
      lowConfidence: recent.length < LOW_CONFIDENCE_BELOW,
    })
  }
  return result
}

/**
 * Accuracy pooled across several sub-domains' mastery windows (a domain or a whole cert).
 * @param {Mastery[]} masteries
 * @returns {{ pct: number | null, practiced: number }} practiced = sub-domains with any answers
 */
export function poolMastery(masteries) {
  let answered = 0
  let correct = 0
  let practiced = 0
  for (const mastery of masteries) {
    answered += mastery.answered
    correct += mastery.correct
    if (mastery.answered > 0) practiced += 1
  }
  return { pct: answered > 0 ? Math.round((correct / answered) * 100) : null, practiced }
}

/**
 * Sub-domains to study next, highest priority first: (1 − mastery) × domain weight.
 * Untouched sub-domains count as 0% mastery. The sort is stable, so ties keep blueprint order.
 * @param {CertSummary} cert
 * @param {Map<string, Mastery>} mastery
 * @param {number} [limit]
 * @returns {Recommendation[]}
 */
export function recommendNext(cert, mastery, limit = 3) {
  return cert.domains
    .flatMap((domain) =>
      domain.subdomains.map((subdomain) => {
        const current = mastery.get(subdomain.id) ?? NO_MASTERY
        return {
          subdomain,
          domain,
          mastery: current,
          priority: (1 - (current.pct ?? 0) / 100) * domain.weight,
        }
      }),
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}
