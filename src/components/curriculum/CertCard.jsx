import { Link } from 'react-router-dom'
import { listSubdomains } from '../../content/certs.js'
import { poolMastery } from '../../engine/mastery.js'
import { useCertProgress } from '../../hooks/useCertProgress.js'
import { describeMastery } from '../../lib/format.js'

/** @param {{ cert: import('../../content/certs.js').CertSummary }} props */
export default function CertCard({ cert }) {
  const progress = useCertProgress(cert.id)
  const taskCount = listSubdomains(cert.id).length
  const summary = progress
    ? describeMastery(poolMastery([...progress.mastery.values()]), taskCount)
    : 'Loading progress…'
  return (
    <Link
      to={`/${cert.id}`}
      className="block h-full rounded-2xl bg-surface p-5 shadow-container hover:bg-surface-alt"
    >
      <span className="block text-sm font-semibold tracking-wide text-accent">{cert.code}</span>
      <span className="mt-1 block text-lg font-medium">{cert.title}</span>
      <span className="mt-2 block text-sm text-ink-muted">
        {cert.itemCount} questions · {taskCount} tasks
      </span>
      <span className="mt-1 block text-sm">{summary}</span>
    </Link>
  )
}
