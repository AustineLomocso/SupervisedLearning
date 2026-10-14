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
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${done ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50' : 'border-slate-300 dark:border-slate-700'}`}
          >
            {done ? (
              <CheckCircleIcon className="size-3.5 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <CircleIcon className="size-3.5 text-slate-500 dark:text-slate-400" />
            )}
            {label}
            <span className="sr-only">{done ? ': done' : ': not done'}</span>
          </li>
        )
      })}
    </ul>
  )
}
