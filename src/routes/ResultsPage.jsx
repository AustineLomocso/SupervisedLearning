import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import Markdown from '../components/markdown/Markdown.jsx'
import ExplanationPanel from '../components/test/ExplanationPanel.jsx'
import { AlertCircleIcon, CheckCircleIcon } from '../components/ui/icons.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getCert, getSubdomain } from '../content/certs.js'
import { NO_MASTERY } from '../engine/mastery.js'
import { isExamKind } from '../engine/testConfig.js'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useAttempt } from '../hooks/useAttempt.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import { formatDuration, formatPct } from '../lib/format.js'
import NotFoundPage from './NotFoundPage.jsx'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').AttemptResult} AttemptResult */
/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/** @typedef {'all' | 'incorrect' | 'marked'} ReviewFilter */

export default function ResultsPage() {
  const { attemptId = '' } = useParams()
  const state = useAttempt(attemptId)
  if (state.status === 'loading') return <Loading label="Loading your results…" />
  if (state.status === 'missing') return <NotFoundPage />
  if (state.status === 'error') {
    return (
      <div role="alert">
        <h1 className="text-3xl font-bold">Couldn’t load these results</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Check your connection and reload the page.
        </p>
      </div>
    )
  }
  const { attempt, items } = state
  if (attempt.status !== 'submitted' || !attempt.result) {
    return <Navigate to={`/attempt/${attemptId}`} replace />
  }
  return <Results attempt={attempt} result={attempt.result} items={items} />
}

/** @param {{ correct: number, total: number }} tally */
const describeTally = (tally) =>
  `${tally.correct} of ${tally.total} correct (${tally.total === 0 ? 0 : Math.round((tally.correct / tally.total) * 100)}%)`

/** @param {{ attempt: Attempt, result: AttemptResult, items: LoadedItem[] }} props */
function Results({ attempt, result, items }) {
  const cert = getCert(attempt.certId)
  const progress = useCertProgress(attempt.certId)
  const exam = isExamKind(attempt.kind)
  const [filter, setFilter] = useState(/** @type {ReviewFilter} */ ('all'))

  const rows = items.map((item, index) => {
    const response = attempt.responses[item.id]
    return { item, index, response }
  })
  const incorrect = rows.filter((row) => row.response?.correct !== true)
  const marked = rows.filter((row) => row.response?.markedForReview === true)
  /** @type {Record<ReviewFilter, typeof rows>} */
  const shown = { all: rows, incorrect, marked }
  /** @type {{ value: ReviewFilter, label: string }[]} */
  const filters = [
    { value: 'all', label: `All (${rows.length})` },
    { value: 'incorrect', label: `Incorrect (${incorrect.length})` },
    { value: 'marked', label: `Marked for review (${marked.length})` },
  ]

  return (
    <>
      <h1 className="text-3xl font-bold">{TEST_KIND_LABELS[attempt.kind]} results</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {cert?.code} · {attempt.mode === 'exam' ? 'Exam mode' : 'Study mode'}
        {attempt.submittedAt !== null &&
          ` · Time used: ${formatDuration(attempt.submittedAt - attempt.startedAt)}`}
      </p>

      <section aria-labelledby="score-heading" className="mt-6">
        <h2 id="score-heading" className="text-xl font-semibold">
          Your score
        </h2>
        <p className="mt-2 text-lg">
          You answered {result.correct} of {result.total} correctly ({formatPct(result.pct)}).
        </p>
        {exam && cert && (
          <div className="mt-3 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
            <p className="text-lg">
              Estimated scaled score:{' '}
              <strong className="tabular-nums">{result.scaledEstimate}</strong> out of 1000
            </p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              {result.passed ? (
                <CheckCircleIcon className="size-5 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <AlertCircleIcon className="size-5 text-amber-700 dark:text-amber-300" />
              )}
              {result.passed
                ? `At or above the estimated pass mark of ${cert.exam.passScaled}`
                : `Below the estimated pass mark of ${cert.exam.passScaled}`}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This is an estimate. AWS doesn’t publish how raw scores become scaled scores, so the
              real exam may differ.
            </p>
          </div>
        )}
        <p className="mt-4 flex flex-wrap gap-3">
          <Link to={`/${attempt.certId}/test/new?kind=drill`} className={buttonClass('primary')}>
            Drill weak areas
          </Link>
          <Link to={`/${attempt.certId}`} className={buttonClass('secondary')}>
            Back to dashboard
          </Link>
        </p>
      </section>

      <section aria-labelledby="domains-heading" className="mt-8">
        <h2 id="domains-heading" className="text-xl font-semibold">
          By domain
        </h2>
        <ul aria-label="Score by domain" className="mt-3 space-y-3">
          {(cert?.domains ?? []).flatMap((domain) => {
            const tally = result.byDomain[domain.id]
            if (!tally) return []
            const pct = tally.total === 0 ? 0 : (tally.correct / tally.total) * 100
            return [
              <li key={domain.id}>
                <p className="font-medium">
                  Domain {domain.no}: {domain.title}
                </p>
                <p className="text-sm">{describeTally(tally)}</p>
                <div aria-hidden="true" className="mt-1 h-2 rounded bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-2 rounded bg-slate-700 dark:bg-slate-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>,
            ]
          })}
        </ul>
      </section>

      <section aria-labelledby="tasks-heading" className="mt-8">
        <h2 id="tasks-heading" className="text-xl font-semibold">
          By task
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table aria-label="Score by task" className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <th scope="col" className="py-2 pr-4">
                  Task
                </th>
                <th scope="col" className="py-2 pr-4">
                  This test
                </th>
                <th scope="col" className="py-2">
                  Your mastery now
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.bySubdomain).map(([id, tally]) => {
                const code = id.split('/')[1]
                const sub = getSubdomain(attempt.certId, code)
                return (
                  <tr key={id} className="border-b border-slate-200 dark:border-slate-800">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      <Link
                        to={`/${attempt.certId}/s/${code}`}
                        className="underline underline-offset-2"
                      >
                        {code}
                      </Link>{' '}
                      {sub?.title}
                    </th>
                    <td className="py-2 pr-4">
                      {tally.correct} of {tally.total}
                    </td>
                    <td className="py-2">
                      {progress ? (
                        <MasteryBadge mastery={progress.mastery.get(id) ?? NO_MASTERY} />
                      ) : (
                        '…'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="review-heading" className="mt-8">
        <h2 id="review-heading" className="text-xl font-semibold">
          Review your answers
        </h2>
        <fieldset className="mt-3">
          <legend className="sr-only">Show</legend>
          <div className="flex flex-wrap gap-3">
            {filters.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="review-filter"
                  value={option.value}
                  checked={filter === option.value}
                  onChange={() => setFilter(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 space-y-8">
          {shown[filter].map(({ item, index, response }) => {
            const answered = (response?.selected.length ?? 0) > 0
            const right = response?.correct === true
            const order = attempt.optionOrder[item.id] ?? item.options.map((option) => option.id)
            const headingId = `review-${item.id}`
            return (
              <article key={item.id} aria-labelledby={headingId}>
                <h3 id={headingId} className="font-semibold">
                  Question {index + 1} · {right ? 'Correct' : answered ? 'Incorrect' : 'Unanswered'}
                  {response?.markedForReview ? ' · Marked for review' : ''}
                </h3>
                <div className="mt-2">
                  <Markdown variant="inline">{item.stem}</Markdown>
                </div>
                <ExplanationPanel
                  item={item}
                  order={order}
                  selected={response?.selected ?? []}
                  correct={right}
                />
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
