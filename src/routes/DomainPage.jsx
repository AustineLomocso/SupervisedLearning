import { Link, useParams } from 'react-router-dom'
import { useCert } from '../hooks/useCert.js'

export default function DomainPage() {
  const cert = useCert()
  const { domainNo } = useParams()
  return (
    <>
      <h1 className="text-3xl font-bold">Domain {domainNo}</h1>
      <Link
        to={`/${cert.id}/test/new?kind=domain&scope=${domainNo}`}
        className="mt-6 inline-block rounded border border-slate-300 px-4 py-2 font-medium hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
      >
        Domain Assessment
      </Link>
    </>
  )
}
