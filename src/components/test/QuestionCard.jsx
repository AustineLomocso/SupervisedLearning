import { useId } from 'react'
import Markdown from '../markdown/Markdown.jsx'
import { countWord } from './words.js'

/**
 * One question: its position, the "Choose TWO" badge for multiple response, the stem, and
 * whatever the runner puts under it (the options).
 * @param {{
 *   item: import('../../content/types.js').LoadedItem,
 *   index: number,
 *   total: number,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function QuestionCard({ item, index, total, children }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold text-ink-muted">
        Question {index + 1} of {total}
      </h2>
      {item.selectCount > 1 && (
        <p className="mt-2 inline-block rounded-full bg-warning-bg px-2 py-0.5 text-sm font-semibold text-warning">
          Choose {countWord(item.selectCount)}
        </p>
      )}
      <div className="mt-2 text-lg">
        <Markdown variant="inline">{item.stem}</Markdown>
      </div>
      {children}
    </section>
  )
}
