import { domainId, parseItemId, subdomainId } from '../content/ids.js'
import { scaledScoreEstimate } from './scaledScore.js'

/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/** @typedef {import('../db/types.js').ItemResponse} ItemResponse */
/** @typedef {import('../db/types.js').AttemptResult} AttemptResult */
/** @typedef {import('../db/types.js').Tally} Tally */

/**
 * Exact set match. Multiple-response questions are all-or-nothing: a subset, a superset or
 * any wrong choice is incorrect.
 * @param {Pick<LoadedItem, 'options'>} item
 * @param {string[]} selected option ids the learner chose
 * @returns {boolean}
 */
export function isCorrect(item, selected) {
  const right = item.options.filter((option) => option.correct).map((option) => option.id)
  const chosen = new Set(selected)
  return chosen.size === right.length && right.every((id) => chosen.has(id))
}

/**
 * The final response for every item when an attempt ends. Unanswered items become wrong
 * answers (selected: []), so score, mastery and answer history all agree.
 * @param {Pick<LoadedItem, 'id' | 'options'>[]} items
 * @param {Record<string, ItemResponse>} responses what the learner saved so far
 * @param {number} now epoch ms, used as the answer time for unanswered items
 * @returns {Record<string, ItemResponse>}
 */
export function finalizeResponses(items, responses, now) {
  /** @type {Record<string, ItemResponse>} */
  const result = {}
  for (const item of items) {
    const previous = responses[item.id]
    const selected = previous?.selected ?? []
    result[item.id] = {
      selected,
      submitted: true,
      correct: isCorrect(item, selected),
      markedForReview: previous?.markedForReview ?? false,
      answeredAt: previous?.answeredAt ?? now,
    }
  }
  return result
}

/**
 * @param {Record<string, Tally>} tallies
 * @param {string} key
 * @param {boolean} right
 */
function tally(tallies, key, right) {
  const entry = (tallies[key] ??= { correct: 0, total: 0 })
  entry.total += 1
  if (right) entry.correct += 1
}

/**
 * Raw score with per-domain and per-sub-domain breakdowns. Items without a graded answer
 * count as wrong.
 * @param {string[]} itemIds every item in the attempt
 * @param {Record<string, ItemResponse>} responses
 * @returns {Pick<AttemptResult, 'correct' | 'total' | 'pct' | 'byDomain' | 'bySubdomain'>}
 */
export function scoreAttempt(itemIds, responses) {
  /** @type {Record<string, Tally>} */
  const byDomain = {}
  /** @type {Record<string, Tally>} */
  const bySubdomain = {}
  let correct = 0
  for (const id of itemIds) {
    const right = responses[id]?.correct === true
    if (right) correct += 1
    const parsed = parseItemId(id)
    if (!parsed) continue
    tally(bySubdomain, subdomainId(parsed.certId, parsed.taskCode), right)
    tally(byDomain, domainId(parsed.certId, parsed.taskCode.split('.')[0]), right)
  }
  const total = itemIds.length
  return {
    correct,
    total,
    pct: total === 0 ? 0 : Math.round((correct / total) * 100),
    byDomain,
    bySubdomain,
  }
}

/**
 * The full stored result: score, breakdowns, scaled estimate and pass flag.
 * @param {string[]} itemIds
 * @param {Record<string, ItemResponse>} responses
 * @param {number} [passScaled] scaled score needed to pass
 * @returns {AttemptResult}
 */
export function buildResult(itemIds, responses, passScaled = 700) {
  const score = scoreAttempt(itemIds, responses)
  const scaledEstimate = scaledScoreEstimate(score.pct)
  return { ...score, scaledEstimate, passed: scaledEstimate >= passScaled }
}
