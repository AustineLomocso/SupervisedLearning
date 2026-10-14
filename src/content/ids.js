/**
 * Canonical identifiers shared by the database, the exam engine and the routes.
 * Sub-domain ids look like "clf-c02/1.1"; domain ids look like "clf-c02/d1".
 */

/**
 * @param {string} certId
 * @param {string} taskCode official task statement code, e.g. "1.1"
 */
export function subdomainId(certId, taskCode) {
  return `${certId}/${taskCode}`
}

/**
 * @param {string} certId
 * @param {number | string} domainNo
 */
export function domainId(certId, domainNo) {
  return `${certId}/d${domainNo}`
}

// Same shape the content schema enforces: "<cert>-<task>-NNNN".
const ITEM_ID = /^([a-z]{3}-c\d{2})-(\d+\.\d+)-\d{4}$/

/**
 * Splits a permanent item id such as "clf-c02-1.1-0042" into its cert and task.
 * @param {string} itemId
 * @returns {{ certId: string, taskCode: string } | null}
 */
export function parseItemId(itemId) {
  const match = ITEM_ID.exec(itemId)
  return match ? { certId: match[1], taskCode: match[2] } : null
}
