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
            className={`rounded-lg border-2 p-3 ${option.correct ? 'border-success bg-success-bg' : 'border-line'}`}
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
                  <CheckCircleIcon className="size-4 text-success" />
                  Correct answer
                </span>
              )}
              {chosen && (
                <span className="inline-flex items-center gap-1">
                  {!option.correct && <AlertCircleIcon className="size-4 text-error" />}
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
