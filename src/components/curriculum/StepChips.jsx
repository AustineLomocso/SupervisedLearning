import { CheckCircleIcon, CircleIcon } from '../ui/icons.jsx'

/** @typedef {import('../../engine/subdomainStatus.js').SubdomainStatus} SubdomainStatus */
/** @typedef {import('../../engine/subdomainStatus.js').StepKey} StepKey */

/** @type {{ key: StepKey, label: string }[]} */
const CHIPS = [
  { key: 'pre', label: 'Pre-Test' },
  { key: 'review', label: 'Review' },
  { key: 'post', label: 'Post-Test' },
]

/**
 * Compact step status for a task row: icon + label, with "done"/"not done" for screen readers.
 * @param {{ status: SubdomainStatus }} props
 */
export default function StepChips({ status }) {
  return (
    <ul aria-label="Steps" className="flex flex-wrap gap-1.5">
      {CHIPS.map(({ key, label }) => {
        const done = status[key].done
        return (
          <li
            key={key}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${done ? 'border-success bg-success-bg' : 'border-line-strong'}`}
          >
            {done ? (
              <CheckCircleIcon className="size-3.5 text-success" />
            ) : (
              <CircleIcon className="size-3.5 text-ink-muted" />
            )}
            {label}
            <span className="sr-only">{done ? ': done' : ': not done'}</span>
          </li>
        )
      })}
    </ul>
  )
}
