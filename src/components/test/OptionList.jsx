import { OPTION_LETTERS } from './words.js'

/** @typedef {import('../../content/types.js').LoadedItem} LoadedItem */

/**
 * The answer choices, in the attempt's stored (shuffled) order. Radios for one answer,
 * checkboxes for multiple response; unchosen boxes are disabled once the limit is reached.
 * @param {{
 *   item: LoadedItem,
 *   order: string[],
 *   selected: string[],
 *   locked: boolean,
 *   onToggle: (optionId: string) => void,
 * }} props
 */
export default function OptionList({ item, order, selected, locked, onToggle }) {
  const options = order.flatMap((id) => item.options.filter((option) => option.id === id))
  const multiple = item.selectCount > 1
  const atLimit = multiple && selected.length >= item.selectCount
  return (
    <fieldset disabled={locked} className="mt-4 min-w-0">
      <legend className="sr-only">Answer options</legend>
      <div className="space-y-2">
        {options.map((option, position) => {
          const checked = selected.includes(option.id)
          const unavailable = atLimit && !checked
          return (
            <label
              key={option.id}
              className={`flex items-start gap-3 rounded-xl border-2 p-3 ${checked ? 'border-accent bg-surface-alt' : 'border-line-strong bg-surface'} ${unavailable || locked ? 'opacity-70' : 'cursor-pointer hover:border-accent'}`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={item.id}
                value={option.id}
                checked={checked}
                disabled={unavailable}
                onChange={() => onToggle(option.id)}
                className="mt-1"
              />
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded border border-line-strong text-sm font-semibold"
              >
                {OPTION_LETTERS[position]}
              </span>
              <span>{option.text}</span>
            </label>
          )
        })}
      </div>
      {multiple && (
        <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
          {selected.length} of {item.selectCount} chosen
        </p>
      )}
    </fieldset>
  )
}
