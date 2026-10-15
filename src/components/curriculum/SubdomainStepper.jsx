import { Link } from 'react-router-dom'
import { formatDate, formatPct } from '../../lib/format.js'
import { CheckCircleIcon } from '../ui/icons.jsx'
import { buttonClass } from '../ui/styles.js'

/** @typedef {import('../../engine/subdomainStatus.js').SubdomainStatus} SubdomainStatus */
/** @typedef {import('../../engine/subdomainStatus.js').StepKey} StepKey */

/** @type {{ key: StepKey, label: string, purpose: string }[]} */
const STEPS = [
  { key: 'pre', label: 'Pre-Test', purpose: 'Find out what you already know.' },
  { key: 'review', label: 'Review', purpose: 'Read the lesson for this task.' },
  { key: 'post', label: 'Post-Test', purpose: 'Check what you learned.' },
]

/**
 * @param {SubdomainStatus} status
 * @param {StepKey} key
 */
function summary(status, key) {
  if (key === 'review') {
    const { completedAt } = status.review
    return completedAt === null ? 'Not reviewed yet' : `Reviewed ${formatDate(completedAt)}`
  }
  const step = status[key]
  return step.done ? `Done · best score ${formatPct(step.bestPct)}` : 'Not taken yet'
}

/**
 * Pre-Test → Review → Post-Test. Nothing is locked. The recommended next step gets the
 * primary button and a visible "Recommended next" label.
 * @param {{ certId: string, taskCode: string, status: SubdomainStatus }} props
 */
export default function SubdomainStepper({ certId, taskCode, status }) {
  /** @type {Record<StepKey, string>} */
  const links = {
    pre: `/${certId}/test/new?kind=pre&scope=${taskCode}`,
    review: `/${certId}/s/${taskCode}/review`,
    post: `/${certId}/test/new?kind=post&scope=${taskCode}`,
  }
  return (
    <ol aria-label="Learning path" className="mt-6 space-y-4">
      {STEPS.map((step, index) => {
        const done = status[step.key].done
        const recommended = status.next === step.key
        return (
          <li
            key={step.key}
            className={`flex flex-wrap items-center gap-4 rounded-lg border p-4 ${recommended ? 'border-accent' : 'border-line'}`}
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-line font-semibold"
            >
              {done ? <CheckCircleIcon className="size-5 text-success" /> : index + 1}
            </span>
            <div className="min-w-48 flex-1">
              {recommended && (
                <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                  Recommended next
                </p>
              )}
              <p className="text-ink-muted">{step.purpose}</p>
              <p className="mt-1 text-sm">{summary(status, step.key)}</p>
            </div>
            <Link
              to={links[step.key]}
              className={buttonClass(recommended ? 'primary' : 'secondary')}
            >
              {step.label}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
