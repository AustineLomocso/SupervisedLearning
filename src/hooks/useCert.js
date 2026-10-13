import { useParams } from 'react-router-dom'
import { getCert } from '../content/certs.js'

/**
 * The cert for the current `:certId` route. CertGuard has already rejected unknown ids.
 * @returns {import('../content/certs.js').CertSummary}
 */
export function useCert() {
  const { certId = '' } = useParams()
  const cert = getCert(certId)
  if (!cert) throw new Error(`Unknown certification: ${certId}`)
  return cert
}
