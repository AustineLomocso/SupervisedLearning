import { Link } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import MasteryHeatmap from '../components/curriculum/MasteryHeatmap.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { NO_MASTERY, poolMastery, recommendNext } from '../engine/mastery.js'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import { deleteAttempt } from '../db/attempts.js'
import { describeMastery, formatDate, formatWeight } from '../lib/format.js'

/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../hooks/useCertProgress.js').CertProgress} CertProgress */

/** @type {import('../db/types.js').AttemptKind[]} */
const CERT_WIDE_TESTS = ['diagnostic', 'drill', 'full']

export default function CertDashboardPage() {
  const cert = useCert()
  const progress = useCertProgress(cert.id)
  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold">
        {cert.code}: {cert.title}
      </h1>
      <p className="mt-2 text-ink-muted">
        The real exam has {cert.exam.questions} questions in {cert.exam.minutes} minutes. A scaled
        score of {cert.exam.passScaled} passes.
      </p>
      {progress ? (
        <DashboardBody cert={cert} progress={progress} />
      ) : (
        <Loading label="Loading your progress…" />
      )}
    </>
  )
}

/** @param {{ cert: CertSummary, progress: CertProgress }} props */
function DashboardBody({ cert, progress }) {
  const isNew = progress.answeredCount === 0
  return (
    <>
      <InProgress
        attempts={progress.attempts.filter((attempt) => attempt.status === 'in_progress')}
      />
      <section aria-labelledby="exams-heading" className="mt-6">
        <h2 id="exams-heading" className="text-lg font-bold">
          Practice exams
        </h2>
        {isNew && (
          <p className="mt-2">New here? Start with the Diagnostic Exam to find your weak areas.</p>
        )}
        <ul className="mt-3 flex flex-wrap gap-3">
          {CERT_WIDE_TESTS.map((kind) => (
            <li key={kind}>
              <Link
                to={`/${cert.id}/test/new?kind=${kind}`}
                className={buttonClass(isNew && kind === 'diagnostic' ? 'primary' : 'secondary')}
              >
                {TEST_KIND_LABELS[kind]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="next-heading" className="mt-8">
        <h2 id="next-heading" className="text-lg font-bold">
          Recommended next
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          The tasks with the most to gain, weighted by how much of the exam their domain covers.
        </p>
        <ol aria-labelledby="next-heading" className="mt-3 space-y-2">
          {recommendNext(cert, progress.mastery).map(({ subdomain, domain, mastery }) => (
            <li
              key={subdomain.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-surface-alt p-3"
            >
              <div>
                <Link
                  to={`/${cert.id}/s/${subdomain.code}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  Task {subdomain.code}: {subdomain.title}
                </Link>
                <p className="text-sm text-ink-muted">
                  Domain {domain.no}: {domain.title}
                </p>
              </div>
              <MasteryBadge mastery={mastery} />
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8">
        <MasteryHeatmap cert={cert} mastery={progress.mastery} />
      </div>

      <section aria-labelledby="domains-heading" className="mt-8">
        <h2 id="domains-heading" className="text-lg font-bold">
          Domains
        </h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {cert.domains.map((domain) => {
            const pooled = poolMastery(
              domain.subdomains.map((sub) => progress.mastery.get(sub.id) ?? NO_MASTERY),
            )
            return (
              <li key={domain.id}>
                <Link
                  to={`/${cert.id}/d/${domain.no}`}
                  className="block h-full rounded-2xl bg-surface p-5 shadow-container hover:bg-surface-alt"
                >
                  <span className="block font-semibold">
                    Domain {domain.no}: {domain.title}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {formatWeight(domain.weight)} of the exam · {domain.subdomains.length} tasks
                  </span>
                  <span className="mt-1 block text-sm">
                    {describeMastery(pooled, domain.subdomains.length)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}

/** @param {{ attempts: import('../db/types.js').Attempt[] }} props */
function InProgress({ attempts }) {
  if (attempts.length === 0) return null
  return (
    <section aria-labelledby="inprogress-heading" className="mt-6">
      <h2 id="inprogress-heading" className="text-lg font-bold">
        In progress
      </h2>
      <ul aria-label="Unfinished tests" className="mt-3 space-y-2">
        {attempts.map((attempt) => {
          const label = TEST_KIND_LABELS[attempt.kind]
          const answered = Object.values(attempt.responses).filter(
            (response) => response.selected.length > 0,
          ).length
          const started = formatDate(attempt.startedAt)
          return (
            <li
              key={attempt.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-alt p-3"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-ink-muted">
                  Started {started} · {answered} of {attempt.itemIds.length} answered
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/attempt/${attempt.id}`}
                  aria-label={`Resume ${label} started ${started}`}
                  className={buttonClass('primary')}
                >
                  Resume
                </Link>
                <button
                  type="button"
                  aria-label={`Discard ${label} started ${started}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Discard this unfinished test? Your answers in it will be lost.',
                      )
                    ) {
                      deleteAttempt(attempt.id).catch((error) =>
                        console.error('Failed to discard attempt', error),
                      )
                    }
                  }}
                  className={buttonClass('danger')}
                >
                  Discard
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
