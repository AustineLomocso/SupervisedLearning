import CertCard from '../components/curriculum/CertCard.jsx'
import { CERTS } from '../content/certs.js'

export default function HomePage() {
  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold">AWS Practitioner Exam Prep</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
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
        className="mt-8 rounded-2xl border-l-4 border-info bg-info-bg p-4 text-sm"
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
