/** AWS passes at a scaled score of 700 (the real mapping is not public). */
export const PASS_SCALED = 700

/**
 * A rough estimate of the AWS scaled score, piecewise linear: 0% → 100, 70% → 700,
 * 100% → 1000. Always shown to learners as an estimate.
 * @param {number} pct percent correct, 0–100
 * @returns {number} 100–1000
 */
export function scaledScoreEstimate(pct) {
  const clamped = Math.min(100, Math.max(0, pct))
  const scaled = clamped <= 70 ? 100 + (clamped / 70) * 600 : 700 + ((clamped - 70) / 30) * 300
  return Math.round(scaled)
}
