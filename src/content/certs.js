import manifestJson from '../generated/manifest.json'

/** @typedef {import('./types.js').Manifest} Manifest */
/** @typedef {import('./types.js').ManifestCert} CertSummary */
/** @typedef {import('./types.js').ManifestDomain} DomainSummary */
/** @typedef {import('./types.js').ManifestSubdomain} SubdomainSummary */

/** Generated from content/<cert>/blueprint.json by `npm run build:index`. */
const manifest = /** @type {Manifest} */ (/** @type {unknown} */ (manifestJson))

/**
 * Supported certifications, in display order.
 * @type {CertSummary[]}
 */
export const CERTS = manifest.certs

/**
 * @param {string} certId
 * @returns {CertSummary | null}
 */
export function getCert(certId) {
  return CERTS.find((cert) => cert.id === certId) ?? null
}

/**
 * @param {string} certId
 * @param {number | string} domainNo route params arrive as strings
 * @returns {DomainSummary | null}
 */
export function getDomain(certId, domainNo) {
  const no = Number(domainNo)
  return getCert(certId)?.domains.find((domain) => domain.no === no) ?? null
}

/**
 * @param {string} certId
 * @param {string} taskCode e.g. "1.1"
 * @returns {SubdomainSummary | null}
 */
export function getSubdomain(certId, taskCode) {
  return listSubdomains(certId).find((sub) => sub.code === taskCode) ?? null
}

/**
 * @param {string} certId
 * @returns {SubdomainSummary[]}
 */
export function listSubdomains(certId) {
  return getCert(certId)?.domains.flatMap((domain) => domain.subdomains) ?? []
}
