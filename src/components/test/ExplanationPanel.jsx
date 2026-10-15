import { useEffect, useId, useRef } from 'react'
import Markdown from '../markdown/Markdown.jsx'
import { AlertCircleIcon, CheckCircleIcon } from '../ui/icons.jsx'
import OptionRationale from './OptionRationale.jsx'
import ReferenceList from './ReferenceList.jsx'
import ReportIssueForm from './ReportIssueForm.jsx'

/**
 * Shown after an answer is locked (Study mode) and in the results review: the verdict, an
 * explanation of every option, the overall explanation, AWS references and Report issue.
 * @param {{
 *   item: import('../../content/types.js').LoadedItem,
 *   order: string[],
 *   selected: string[],
 *   correct: boolean,
 *   focusOnMount?: boolean,
 * }} props
 */
export default function ExplanationPanel({ item, order, selected, correct, focusOnMount = false }) {
  const headingId = useId()
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null))

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  return (
    <section
      aria-labelledby={headingId}
      className="mt-6 rounded-2xl bg-surface p-4 shadow-container"
    >
      <output className="flex items-center gap-2 text-lg font-bold">
        {correct ? (
          <CheckCircleIcon className="size-6 text-success" />
        ) : (
          <AlertCircleIcon className="size-6 text-error" />
        )}
        {correct ? 'Correct' : 'Incorrect'}
      </output>
      <h3
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-lg font-semibold outline-none"
      >
        Explanation
      </h3>
      <OptionRationale item={item} order={order} selected={selected} />
      <div className="mt-4">
        <Markdown variant="inline">{item.explanation}</Markdown>
      </div>
      <ReferenceList references={item.references} />
      <ReportIssueForm item={item} />
    </section>
  )
}
