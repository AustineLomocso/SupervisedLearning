import { useSearchParams } from 'react-router-dom'
import { isTestKind, TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function TestSetupPage() {
  const cert = useCert()
  const [searchParams] = useSearchParams()
  const kind = searchParams.get('kind')
  if (!isTestKind(kind)) return <NotFoundPage />
  const scope = searchParams.get('scope')
  return (
    <>
      <h1 className="text-3xl font-bold">{TEST_KIND_LABELS[kind]}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {cert.code}
        {scope ? ` · ${scope}` : ''}
      </p>
    </>
  )
}
