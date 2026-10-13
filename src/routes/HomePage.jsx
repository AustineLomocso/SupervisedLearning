import { Link } from 'react-router-dom'
import { CERTS } from '../content/certs.js'

export default function HomePage() {
  return (
    <>
      <h1 className="text-3xl font-bold">AWS Practitioner Exam Prep</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Pick a certification. Start with a diagnostic exam to find your weak areas, work through
        each domain, then finish with a full practice exam.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {CERTS.map((cert) => (
          <li key={cert.id}>
            <Link
              to={`/${cert.id}`}
              className="block rounded-lg border border-slate-200 p-5 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
            >
              <span className="block text-sm font-semibold tracking-wide text-amber-700 dark:text-amber-400">
                {cert.code}
              </span>
              <span className="mt-1 block text-lg font-medium">{cert.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
