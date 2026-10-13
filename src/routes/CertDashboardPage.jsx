import { Link } from 'react-router-dom'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'

/** @type {import('../db/types.js').AttemptKind[]} */
const CERT_WIDE_TESTS = ['diagnostic', 'drill', 'full']

export default function CertDashboardPage() {
  const cert = useCert()
  return (
    <>
      <h1 className="text-3xl font-bold">
        {cert.code}: {cert.title}
      </h1>
      <ul className="mt-6 flex flex-wrap gap-3">
        {CERT_WIDE_TESTS.map((kind) => (
          <li key={kind}>
            <Link
              to={`/${cert.id}/test/new?kind=${kind}`}
              className="inline-block rounded border border-slate-300 px-4 py-2 font-medium hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
            >
              {TEST_KIND_LABELS[kind]}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
