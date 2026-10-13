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
