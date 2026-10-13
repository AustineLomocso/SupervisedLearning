/**
 * @param {number | null} pct whole percent
 * @returns {string}
 */
export function formatPct(pct) {
  return pct === null ? '—' : `${pct}%`
}

/**
 * @param {number} weight share of the exam, 0–1
 * @returns {string}
 */
export function formatWeight(weight) {
  return `${Math.round(weight * 100)}%`
}

/**
 * @param {number} epochMs
 * @returns {string} e.g. "Oct 14, 2026" in the learner's locale
 */
export function formatDate(epochMs) {
  return new Date(epochMs).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/**
 * One-line summary of pooled mastery for a cert or domain card.
 * @param {{ pct: number | null, practiced: number }} pooled from poolMastery()
 * @param {number} taskCount
 * @returns {string}
 */
export function describeMastery(pooled, taskCount) {
  return pooled.pct === null
    ? 'Not started yet'
    : `Mastery ${pooled.pct}% · ${pooled.practiced} of ${taskCount} tasks practiced`
}
