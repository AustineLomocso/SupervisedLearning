import { AlertCircleIcon, CheckCircleIcon } from '../ui/icons.jsx'
import { OPTION_LETTERS } from './words.js'

/**
 * Every option with its own explanation, in the order the learner saw them. The right
 * answer(s) and the learner's choice(s) are marked with icon and text, not color alone.
 * @param {{
 *   item: import('../../content/types.js').LoadedItem,
 *   order: string[],
 *   selected: string[],
 * }} props
 */
export default function OptionRationale({ item, order, selected }) {
  const options = order.flatMap((id) => item.options.filter((option) => option.id === id))
  return (
    <ol aria-label="Why each option is right or wrong" className="mt-4 space-y-3">
      {options.map((option, position) => {
        const chosen = selected.includes(option.id)
        return (
          <li
            key={option.id}
            className={`rounded-lg border p-3 ${option.correct ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50' : 'border-slate-200 dark:border-slate-800'}`}
          >
            <p className="flex flex-wrap items-center gap-x-2 font-medium">
              <span aria-hidden="true" className="font-semibold">
                {OPTION_LETTERS[position]}.
              </span>
              {option.text}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-4 text-sm font-semibold">
              {option.correct && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircleIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
                  Correct answer
                </span>
              )}
              {chosen && (
                <span className="inline-flex items-center gap-1">
                  {!option.correct && (
                    <AlertCircleIcon className="size-4 text-red-700 dark:text-red-400" />
                  )}
                  Your answer
                </span>
              )}
            </p>
            <p className="mt-1 text-sm">{option.rationale}</p>
          </li>
        )
      })}
    </ol>
  )
}
