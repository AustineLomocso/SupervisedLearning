/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').SubdomainProgress} SubdomainProgress */

/** @typedef {'pre' | 'review' | 'post'} StepKey */

/**
 * @typedef {object} TestStepStatus
 * @property {boolean} done at least one submitted attempt
 * @property {number | null} bestPct best score across submitted attempts
 */

/**
 * @typedef {object} SubdomainStatus
 * @property {TestStepStatus} pre
 * @property {{ done: boolean, completedAt: number | null }} review
 * @property {TestStepStatus} post
 * @property {StepKey | null} next the step to highlight; null once the Post-Test is done
 */

/**
 * @param {Attempt[]} attempts
 * @param {'pre' | 'post'} kind
 * @param {string} subdomainId
 * @returns {TestStepStatus}
 */
function testStep(attempts, kind, subdomainId) {
  const scores = attempts.flatMap((attempt) =>
    attempt.kind === kind &&
    attempt.scopeId === subdomainId &&
    attempt.status === 'submitted' &&
    attempt.result
      ? [attempt.result.pct]
      : [],
  )
  return { done: scores.length > 0, bestPct: scores.length > 0 ? Math.max(...scores) : null }
}

/**
 * Where the learner is in a sub-domain's Pre-Test → Review → Post-Test path. Test steps are
 * derived from attempts; only Review completion is stored (db/progress.js).
 * @param {string} subdomainId e.g. "clf-c02/1.1"
 * @param {Attempt[]} attempts any attempts; filtered here
 * @param {SubdomainProgress | undefined} progress
 * @returns {SubdomainStatus}
 */
export function deriveSubdomainStatus(subdomainId, attempts, progress) {
  const pre = testStep(attempts, 'pre', subdomainId)
  const post = testStep(attempts, 'post', subdomainId)
  const completedAt = progress?.reviewCompletedAt ?? null
  const review = { done: completedAt !== null, completedAt }
  // Recommend the step after the furthest one completed, so finishing a later step never
  // sends the learner back to an earlier one.
  const next = post.done ? null : review.done ? 'post' : pre.done ? 'review' : 'pre'
  return { pre, review, post, next }
}
