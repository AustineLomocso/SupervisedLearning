import { db } from './db.js'

/** @typedef {import('./types.js').Attempt} Attempt */
/** @typedef {import('./types.js').AttemptKind} AttemptKind */
/** @typedef {import('./types.js').AttemptMode} AttemptMode */
/** @typedef {import('./types.js').AttemptStatus} AttemptStatus */
/** @typedef {import('./types.js').AttemptResult} AttemptResult */
/** @typedef {import('./types.js').ItemResponse} ItemResponse */

/**
 * @typedef {object} NewAttempt
 * @property {string} certId
 * @property {AttemptKind} kind
 * @property {string} scopeId
 * @property {AttemptMode} mode
 * @property {string[]} itemIds
 * @property {Record<string, string[]>} optionOrder
 * @property {number | null} [timeLimitSec] set for timed exams; stored as an absolute deadline
 */

/**
 * @param {NewAttempt} input
 * @param {number} [now] epoch ms
 * @returns {Promise<Attempt>}
 */
export async function createAttempt(input, now = Date.now()) {
  /** @type {Attempt} */
  const attempt = {
    id: crypto.randomUUID(),
    certId: input.certId,
    kind: input.kind,
    scopeId: input.scopeId,
    mode: input.mode,
    status: 'in_progress',
    startedAt: now,
    // Absolute deadline, so a page refresh resumes the countdown instead of resetting it.
    deadlineAt: input.timeLimitSec ? now + input.timeLimitSec * 1000 : null,
    submittedAt: null,
    itemIds: input.itemIds,
    optionOrder: input.optionOrder,
    responses: {},
    currentIndex: 0,
    result: null,
  }
  await db.attempts.add(attempt)
  return attempt
}

/**
 * @param {string} id
 * @returns {Promise<Attempt | undefined>}
 */
export function getAttempt(id) {
  return db.attempts.get(id)
}

/**
 * Persists one answer and the learner's position immediately, so a refresh mid-test resumes.
 * @param {string} attemptId
 * @param {string} itemId
 * @param {ItemResponse} response
 * @param {number} currentIndex
 */
export async function saveResponse(attemptId, itemId, response, currentIndex) {
  // modify() rather than update(): item ids contain dots, which update() would read as a key path.
  // Do not "simplify" this back to db.attempts.update(attemptId, { [`responses.${itemId}`]: response }) -
  // see the regression test in attempts.test.js named for this exact guard.
  const count = await db.attempts
    .where('id')
    .equals(attemptId)
    .modify((attempt) => {
      attempt.responses[itemId] = response
      attempt.currentIndex = currentIndex
    })
  if (count === 0) throw new Error(`Attempt not found: ${attemptId}`)
}

/**
 * @param {string} attemptId
 * @param {AttemptResult} result
 * @param {number} [now] epoch ms
 */
export async function submitAttempt(attemptId, result, now = Date.now()) {
  const count = await db.attempts.update(attemptId, {
    status: 'submitted',
    submittedAt: now,
    result,
  })
  if (count === 0) throw new Error(`Attempt not found: ${attemptId}`)
}

/**
 * @param {string} certId
 * @param {{ kind?: AttemptKind, status?: AttemptStatus }} [filter]
 * @returns {Promise<Attempt[]>} newest first
 */
export async function listAttempts(certId, filter = {}) {
  const collection = filter.kind
    ? db.attempts.where('[certId+kind]').equals([certId, filter.kind])
    : db.attempts.where('certId').equals(certId)
  const attempts = await collection.toArray()
  return attempts
    .filter((attempt) => !filter.status || attempt.status === filter.status)
    .sort((a, b) => b.startedAt - a.startedAt)
}

/**
 * @param {string} certId
 * @returns {Promise<Attempt[]>} newest first
 */
export function listInProgress(certId) {
  return listAttempts(certId, { status: 'in_progress' })
}
