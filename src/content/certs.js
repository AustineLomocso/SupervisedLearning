/**
 * @typedef {object} CertSummary
 * @property {string} id route + storage id, e.g. "clf-c02"
 * @property {string} code official exam code, e.g. "CLF-C02"
 * @property {string} title
 */

/**
 * Supported certifications. Phase 2 replaces this literal with data from the generated
 * content manifest; keep `CERTS` and `getCert` signatures stable.
 * @type {CertSummary[]}
 */
export const CERTS = [
  { id: 'clf-c02', code: 'CLF-C02', title: 'AWS Certified Cloud Practitioner' },
  { id: 'aif-c01', code: 'AIF-C01', title: 'AWS Certified AI Practitioner' },
]

/**
 * @param {string} certId
 * @returns {CertSummary | null}
 */
export function getCert(certId) {
  return CERTS.find((cert) => cert.id === certId) ?? null
}
