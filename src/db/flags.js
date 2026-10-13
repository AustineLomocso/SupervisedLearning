import { db } from './db.js'

/** @typedef {import('./types.js').Flag} Flag */
/** @typedef {import('./types.js').FlagReason} FlagReason */

/** @type {FlagReason[]} */
export const FLAG_REASONS = ['wrong-answer', 'unclear', 'outdated', 'typo', 'other']

/**
 * @typedef {object} NewFlag
 * @property {string} itemId
 * @property {number} itemVersion
 * @property {string} certId
 * @property {FlagReason} reason
 * @property {string} [note]
 */

/**
 * Saves a learner's report about a question. Reports stay in this browser until exported.
 * @param {NewFlag} input
 * @param {number} [now] epoch ms
 * @returns {Promise<number>} the new report's id
 */
export async function addFlag(input, now = Date.now()) {
  if (!FLAG_REASONS.includes(input.reason)) {
    throw new Error(`Unknown flag reason: ${input.reason}`)
  }
  const id = await db.flags.add({
    itemId: input.itemId,
    itemVersion: input.itemVersion,
    certId: input.certId,
    reason: input.reason,
    note: (input.note ?? '').trim(),
    createdAt: now,
  })
  return /** @type {number} */ (id)
}

/** @returns {Promise<Flag[]>} newest first */
export function listFlags() {
  return db.flags.orderBy('createdAt').reverse().toArray()
}

/** @param {number} id */
export async function deleteFlag(id) {
  await db.flags.delete(id)
}

export async function clearFlags() {
  await db.flags.clear()
}
