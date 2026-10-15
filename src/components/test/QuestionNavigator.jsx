/**
 * Jump between questions in Exam mode. State is shown by fill and a flag glyph and spoken
 * in the button's name, never by color alone.
 * @param {{
 *   itemIds: string[],
 *   responses: Record<string, import('../../db/types.js').ItemResponse>,
 *   currentIndex: number,
 *   onGo: (index: number) => void,
 * }} props
 */
export default function QuestionNavigator({ itemIds, responses, currentIndex, onGo }) {
  return (
    <nav aria-label="Question navigator">
      <ol className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
        {itemIds.map((id, index) => {
          const response = responses[id]
          const answered = (response?.selected.length ?? 0) > 0
          const marked = response?.markedForReview === true
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onGo(index)}
                aria-current={index === currentIndex ? 'step' : undefined}
                aria-label={`Question ${index + 1}: ${answered ? 'answered' : 'unanswered'}${marked ? ', marked for review' : ''}`}
                className={`relative flex h-9 w-full items-center justify-center rounded-full border-2 text-sm font-semibold ${answered ? 'border-accent bg-accent text-on-accent' : 'border-line-strong'} ${index === currentIndex ? 'ring-2 ring-accent ring-offset-2 ring-offset-page' : ''}`}
              >
                <span aria-hidden="true">{index + 1}</span>
                {marked && (
                  <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 text-xs">
                    ⚑
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-xs text-ink-muted">
        Filled = answered · Outlined = unanswered · ⚑ = marked for review
      </p>
    </nav>
  )
}
