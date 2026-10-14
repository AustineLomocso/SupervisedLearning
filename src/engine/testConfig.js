import { getDomain, getSubdomain } from '../content/certs.js'

/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {'pre' | 'post' | 'domain' | 'drill'} SizedKind */

/**
 * Length choices for each test kind. The Diagnostic and Full exams always use the real exam
 * length.
 * @type {Record<SizedKind, number[]>}
 */
export const LENGTH_CHOICES = {
  pre: [5, 10, 15, 20],
  post: [10, 15, 20, 25],
  domain: [20, 30, 40, 50],
  drill: [10, 20, 30],
}

/** @type {Record<SizedKind, number>} */
export const DEFAULT_LENGTH = { pre: 10, post: 15, domain: 30, drill: 20 }

/**
 * @typedef {object} TestScope
 * @property {string} scopeId stored on the attempt: a sub-domain, domain or cert id
 * @property {string} label
 * @property {number} poolSize active questions available
 */

/**
 * @param {AttemptKind} kind
 * @returns {kind is 'diagnostic' | 'full'}
 */
export function isExamKind(kind) {
  return kind === 'diagnostic' || kind === 'full'
}

/**
 * Resolves the `scope` query parameter for a test kind. Returns null when it doesn't fit.
 * @param {CertSummary} cert
 * @param {AttemptKind} kind
 * @param {string | null} scope task code (pre/post), domain number (domain), or absent
 * @returns {TestScope | null}
 */
export function resolveTestScope(cert, kind, scope) {
  if (kind === 'pre' || kind === 'post') {
    const sub = scope ? getSubdomain(cert.id, scope) : null
    return (
      sub && { scopeId: sub.id, label: `Task ${sub.code}: ${sub.title}`, poolSize: sub.itemCount }
    )
  }
  if (kind === 'domain') {
    const domain = scope ? getDomain(cert.id, scope) : null
    return (
      domain && {
        scopeId: domain.id,
        label: `Domain ${domain.no}: ${domain.title}`,
        poolSize: domain.itemCount,
      }
    )
  }
  return scope === null
    ? { scopeId: cert.id, label: `${cert.code}: ${cert.title}`, poolSize: cert.itemCount }
    : null
}

/**
 * @param {SizedKind} kind
 * @param {number} poolSize
 * @returns {{ value: number, available: boolean }[]}
 */
export function lengthChoices(kind, poolSize) {
  return LENGTH_CHOICES[kind].map((value) => ({ value, available: value <= poolSize }))
}

/**
 * The spec default, or the longest choice that fits a smaller pool.
 * @param {SizedKind} kind
 * @param {number} poolSize
 * @returns {number | null} null when no choice fits
 */
export function defaultLength(kind, poolSize) {
  if (DEFAULT_LENGTH[kind] <= poolSize) return DEFAULT_LENGTH[kind]
  const fitting = LENGTH_CHOICES[kind].filter((value) => value <= poolSize)
  return fitting.length > 0 ? fitting[fitting.length - 1] : null
}
