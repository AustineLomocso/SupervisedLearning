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
                className={`relative flex h-9 w-full items-center justify-center rounded border-2 text-sm font-semibold ${answered ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-400 dark:border-slate-600'} ${index === currentIndex ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-950' : ''}`}
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
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        Filled = answered · Outlined = unanswered · ⚑ = marked for review
      </p>
    </nav>
  )
}
