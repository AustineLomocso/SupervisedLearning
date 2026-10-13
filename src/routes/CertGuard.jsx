import { Outlet, useParams } from 'react-router-dom'
import { getCert } from '../content/certs.js'
import NotFoundPage from './NotFoundPage.jsx'

/** Renders the cert's pages only for a known cert id; anything else is a 404. */
export default function CertGuard() {
  const { certId = '' } = useParams()
  return getCert(certId) ? <Outlet /> : <NotFoundPage />
}
