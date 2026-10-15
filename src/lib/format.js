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

/**
 * @param {number} ms
 * @returns {string} e.g. "45 s", "12 min 5 s", "1 h 12 min"
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours} h ${minutes} min`
  if (minutes > 0) return `${minutes} min ${seconds} s`
  return `${seconds} s`
}
