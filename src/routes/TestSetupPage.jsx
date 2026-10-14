import { useSearchParams } from 'react-router-dom'
import TestSetupForm from '../components/test/TestSetupForm.jsx'
import { resolveTestScope } from '../engine/testConfig.js'
import { isTestKind } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function TestSetupPage() {
  const cert = useCert()
  const [searchParams] = useSearchParams()
  const kind = searchParams.get('kind')
  if (!isTestKind(kind)) return <NotFoundPage />
  const scope = resolveTestScope(cert, kind, searchParams.get('scope'))
  if (!scope) return <NotFoundPage />
  // Remount on a new kind or scope so the form's defaults reset.
  return <TestSetupForm key={`${kind}:${scope.scopeId}`} cert={cert} kind={kind} scope={scope} />
}
