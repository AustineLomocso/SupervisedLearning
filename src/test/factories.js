/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').AttemptResult} AttemptResult */
/** @typedef {import('../db/types.js').ItemResponse} ItemResponse */

/**
 * A complete attempt row (a submitted CLF-C02 Pre-Test for task 1.1 unless overridden).
 * @param {Partial<Attempt>} [overrides]
 * @returns {Attempt}
 */
export function makeAttempt(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    certId: 'clf-c02',
    kind: 'pre',
    scopeId: 'clf-c02/1.1',
    mode: 'study',
    status: 'submitted',
    startedAt: 1_000,
    deadlineAt: null,
    submittedAt: 2_000,
    itemIds: [],
    optionOrder: {},
    responses: {},
    currentIndex: 0,
    result: null,
    ...overrides,
  }
}

/**
 * A graded answer.
 * @param {boolean} correct
 * @param {number | null} answeredAt epoch ms
 * @returns {ItemResponse}
 */
export function graded(correct, answeredAt) {
  return { selected: ['a'], submitted: true, correct, markedForReview: false, answeredAt }
}

/**
 * @param {number} pct
 * @returns {AttemptResult}
 */
export function makeResult(pct) {
  return {
    correct: pct / 10,
    total: 10,
    pct,
    scaledEstimate: 100 + pct * 9,
    passed: pct >= 70,
    byDomain: {},
    bySubdomain: {},
  }
}
