import { db } from './db.js'

/** @typedef {import('./types.js').SubdomainProgress} SubdomainProgress */

/**
 * Pre-/Post-Test completion is derived from attempts; only the Review step is stored here.
 * @param {string} certId
 * @param {string} subdomainId
 * @param {number} [now] epoch ms
 */
export async function markReviewComplete(certId, subdomainId, now = Date.now()) {
  await db.subdomainProgress.put({ subdomainId, certId, reviewCompletedAt: now })
}

/**
 * @param {string} subdomainId
 * @returns {Promise<SubdomainProgress | undefined>}
 */
export function getProgress(subdomainId) {
  return db.subdomainProgress.get(subdomainId)
}

/**
 * @param {string} certId
 * @returns {Promise<SubdomainProgress[]>}
 */
export function listProgressForCert(certId) {
  return db.subdomainProgress.where('certId').equals(certId).toArray()
}
