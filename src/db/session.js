import { getCert } from '../content/certs.js'
import { subdomainId } from '../content/ids.js'
import { buildResult, finalizeResponses, isCorrect } from '../engine/grading.js'
import { getAttempt, saveResponse, submitAttempt } from './attempts.js'
import { db } from './db.js'
import { recordAnswers } from './itemStats.js'
import { requestPersistence } from './persist.js'

/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/** @typedef {import('./types.js').ItemResponse} ItemResponse */
/** @typedef {import('./types.js').AttemptResult} AttemptResult */

/** @type {ItemResponse} */
const EMPTY_RESPONSE = {
  selected: [],
  submitted: false,
  correct: null,
  markedForReview: false,
  answeredAt: null,
}

/**
 * @param {string} attemptId
 * @returns {Promise<import('./types.js').Attempt>}
 */
async function requireAttempt(attemptId) {
  const attempt = await getAttempt(attemptId)
  if (!attempt) throw new Error(`Attempt not found: ${attemptId}`)
  return attempt
}

/**
 * Study mode: locks the learner's answer, grades it, and records the item's history in the
 * same transaction. A second answer to a locked question is ignored.
 * @param {string} attemptId
 * @param {LoadedItem} item
 * @param {string[]} selected option ids
 * @param {number} index the question's position, saved as the current question
 * @param {number} [now] epoch ms
 * @returns {Promise<ItemResponse>}
 */
export function lockAnswer(attemptId, item, selected, index, now = Date.now()) {
  return db.transaction('rw', [db.attempts, db.itemStats], async () => {
    const attempt = await requireAttempt(attemptId)
    const existing = attempt.responses[item.id]
    if (existing?.submitted) return existing
    const correct = isCorrect(item, selected)
    /** @type {ItemResponse} */
    const response = {
      selected,
      submitted: true,
      correct,
      markedForReview: existing?.markedForReview ?? false,
      answeredAt: now,
    }
    await saveResponse(attemptId, item.id, response, index)
    await recordAnswers([
      {
        itemId: item.id,
        certId: attempt.certId,
        subdomainId: subdomainId(attempt.certId, item.taskCode),
        itemVersion: item.version,
        correct,
        at: now,
      },
    ])
    return response
  })
}

/**
 * Exam mode: saves a changeable, ungraded selection. Nothing is graded or recorded until
 * the attempt is finished.
 * @param {string} attemptId
 * @param {LoadedItem} item
 * @param {string[]} selected
 * @param {number} index
 * @param {number} [now] epoch ms
 * @returns {Promise<ItemResponse>}
 */
export async function saveSelection(attemptId, item, selected, index, now = Date.now()) {
  const attempt = await requireAttempt(attemptId)
  const existing = attempt.responses[item.id] ?? EMPTY_RESPONSE
  /** @type {ItemResponse} */
  const response = {
    ...existing,
    selected,
    answeredAt: selected.length > 0 ? now : null,
  }
  await saveResponse(attemptId, item.id, response, index)
  return response
}

/**
 * Exam mode: flips "mark for review" for a question.
 * @param {string} attemptId
 * @param {string} itemId
 * @param {number} index
 */
export async function toggleMarked(attemptId, itemId, index) {
  const attempt = await requireAttempt(attemptId)
  const existing = attempt.responses[itemId] ?? EMPTY_RESPONSE
  await saveResponse(
    attemptId,
    itemId,
    { ...existing, markedForReview: !existing.markedForReview },
    index,
  )
}

/**
 * Ends an attempt: grades everything (unanswered counts as wrong), records history for the
 * items that were not already recorded at lock time, and stores the result, all in one
 * transaction. Calling it again returns the stored result. Afterwards it asks the browser to
 * keep the learner's data.
 * @param {string} attemptId
 * @param {LoadedItem[]} items every item in the attempt
 * @param {number} [now] epoch ms
 * @returns {Promise<AttemptResult>}
 */
export async function finishAttempt(attemptId, items, now = Date.now()) {
  const result = await db.transaction('rw', [db.attempts, db.itemStats], async () => {
    const attempt = await requireAttempt(attemptId)
    if (attempt.status === 'submitted' && attempt.result) return attempt.result

    const responses = finalizeResponses(items, attempt.responses, now)
    const unrecorded = items.filter((item) => !attempt.responses[item.id]?.submitted)
    await recordAnswers(
      unrecorded.map((item) => ({
        itemId: item.id,
        certId: attempt.certId,
        subdomainId: subdomainId(attempt.certId, item.taskCode),
        itemVersion: item.version,
        correct: responses[item.id].correct === true,
        at: responses[item.id].answeredAt ?? now,
      })),
    )
    // Replacing the whole "responses" key is safe: only dotted *nested* paths are the problem.
    await db.attempts.update(attemptId, { responses })
    const passScaled = getCert(attempt.certId)?.exam.passScaled
    const built = buildResult(attempt.itemIds, responses, passScaled)
    await submitAttempt(attemptId, built, now)
    return built
  })
  requestPersistence().catch(() => {})
  return result
}
