import { Link, useParams } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import StepChips from '../components/curriculum/StepChips.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getDomain } from '../content/certs.js'
import { NO_MASTERY } from '../engine/mastery.js'
import { deriveSubdomainStatus } from '../engine/subdomainStatus.js'
import { useCert } from '../hooks/useCert.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import { formatPct, formatWeight } from '../lib/format.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function DomainPage() {
  const cert = useCert()
  const { domainNo = '' } = useParams()
  const domain = getDomain(cert.id, domainNo)
  const progress = useCertProgress(cert.id)
  if (!domain) return <NotFoundPage />

  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold">
        Domain {domain.no}: {domain.title}
      </h1>
      <p className="mt-2 text-ink-muted">
        {formatWeight(domain.weight)} of the exam · {domain.subdomains.length} tasks ·{' '}
        {domain.itemCount} questions
      </p>
      <p className="mt-4">
        <Link
          to={`/${cert.id}/test/new?kind=domain&scope=${domain.no}`}
          className={buttonClass('primary')}
        >
          Domain Assessment
        </Link>
      </p>

      <section aria-labelledby="tasks-heading" className="mt-8">
        <h2 id="tasks-heading" className="text-lg font-bold">
          Tasks
        </h2>
        {progress ? (
          <ol aria-labelledby="tasks-heading" className="mt-2 divide-y divide-line">
            {domain.subdomains.map((sub) => {
              const status = deriveSubdomainStatus(
                sub.id,
                progress.attempts,
                progress.reviews.get(sub.id),
              )
              return (
                <li key={sub.id} className="py-4">
                  <Link
                    to={`/${cert.id}/s/${sub.code}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    Task {sub.code}: {sub.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <MasteryBadge mastery={progress.mastery.get(sub.id) ?? NO_MASTERY} />
                    <StepChips status={status} />
                    {status.post.done && (
                      <span>Best Post-Test score: {formatPct(status.post.bestPct)}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <Loading label="Loading your progress…" />
        )}
      </section>
    </>
  )
}
