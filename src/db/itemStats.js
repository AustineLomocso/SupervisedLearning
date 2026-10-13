import { db } from './db.js'

/** @typedef {import('./types.js').ItemStat} ItemStat */

/**
 * @typedef {object} RecordedAnswer
 * @property {string} itemId
 * @property {string} certId
 * @property {string} subdomainId
 * @property {number} itemVersion
 * @property {boolean} correct
 * @property {number} at epoch ms
 */

/**
 * Updates per-item history used for unseen-first selection and mastery.
 * @param {RecordedAnswer} answer
 */
export async function recordAnswer(answer) {
  await db.transaction('rw', db.itemStats, async () => {
    const existing = await db.itemStats.get(answer.itemId)
    await db.itemStats.put({
      itemId: answer.itemId,
      certId: answer.certId,
      subdomainId: answer.subdomainId,
      itemVersion: answer.itemVersion,
      seenCount: (existing?.seenCount ?? 0) + 1,
      correctCount: (existing?.correctCount ?? 0) + (answer.correct ? 1 : 0),
      lastSeenAt: answer.at,
      lastCorrect: answer.correct,
    })
  })
}

/**
 * @param {string} subdomainId
 * @returns {Promise<ItemStat[]>}
 */
export function getStatsForSubdomain(subdomainId) {
  return db.itemStats.where('subdomainId').equals(subdomainId).toArray()
}

/**
 * @param {string} certId
 * @returns {Promise<ItemStat[]>}
 */
export function getStatsForCert(certId) {
  return db.itemStats.where('certId').equals(certId).toArray()
}
