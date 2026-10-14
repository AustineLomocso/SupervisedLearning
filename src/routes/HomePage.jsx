import CertCard from '../components/curriculum/CertCard.jsx'
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
            <CertCard cert={cert} />
          </li>
        ))}
      </ul>
      <aside
        aria-label="About this app"
        className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <p>
          <strong>Not affiliated with AWS.</strong> This is an independent study aid, not an
          official AWS product.
        </p>
        <p className="mt-2">
          <strong>AI-generated content.</strong> Questions and lessons were written with AI and may
          contain mistakes. Check the linked AWS documentation, and use “Report issue” on any
          question to flag a problem.
        </p>
      </aside>
    </>
  )
}
