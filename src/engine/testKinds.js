/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */

/** @type {Record<AttemptKind, string>} */
export const TEST_KIND_LABELS = {
  pre: 'Pre-Test',
  post: 'Post-Test',
  domain: 'Domain Assessment',
  diagnostic: 'Diagnostic Exam',
  full: 'Full Practice Exam',
  drill: 'Weak-Area Drill',
}

/**
 * @param {unknown} value
 * @returns {value is AttemptKind}
 */
export function isTestKind(value) {
  return typeof value === 'string' && Object.hasOwn(TEST_KIND_LABELS, value)
}
