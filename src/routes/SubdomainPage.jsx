import { Link, useParams } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import SubdomainStepper from '../components/curriculum/SubdomainStepper.jsx'
import Loading from '../components/ui/Loading.jsx'
import { getSubdomain } from '../content/certs.js'
import { NO_MASTERY } from '../engine/mastery.js'
import { deriveSubdomainStatus } from '../engine/subdomainStatus.js'
import { useCert } from '../hooks/useCert.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function SubdomainPage() {
  const cert = useCert()
  const { taskCode = '' } = useParams()
  const subdomain = getSubdomain(cert.id, taskCode)
  const progress = useCertProgress(cert.id)
  if (!subdomain) return <NotFoundPage />
  const domain = cert.domains.find((candidate) => candidate.subdomains.includes(subdomain))

  return (
    <>
      <h1 className="text-3xl font-bold">
        Task {subdomain.code}: {subdomain.title}
      </h1>
      {domain && (
        <p className="mt-2">
          <Link
            to={`/${cert.id}/d/${domain.no}`}
            className="font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400"
          >
            Domain {domain.no}: {domain.title}
          </Link>
        </p>
      )}
      {progress ? (
        <>
          <p className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-medium">Your mastery:</span>
            <MasteryBadge mastery={progress.mastery.get(subdomain.id) ?? NO_MASTERY} />
          </p>
          <SubdomainStepper
            certId={cert.id}
            taskCode={subdomain.code}
            status={deriveSubdomainStatus(
              subdomain.id,
              progress.attempts,
              progress.reviews.get(subdomain.id),
            )}
          />
        </>
      ) : (
        <Loading label="Loading your progress…" />
      )}
    </>
  )
}
