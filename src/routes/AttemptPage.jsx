import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ExplanationPanel from '../components/test/ExplanationPanel.jsx'
import OptionList from '../components/test/OptionList.jsx'
import QuestionCard from '../components/test/QuestionCard.jsx'
import QuestionNavigator from '../components/test/QuestionNavigator.jsx'
import Timer from '../components/test/Timer.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getCert } from '../content/certs.js'
import { saveCurrentIndex } from '../db/attempts.js'
import { finishAttempt, lockAnswer, saveSelection, toggleMarked } from '../db/session.js'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useAttempt } from '../hooks/useAttempt.js'
import { nextSelection, useSessionStore } from '../stores/useSessionStore.js'
import NotFoundPage from './NotFoundPage.jsx'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */

export default function AttemptPage() {
  const { attemptId = '' } = useParams()
  const state = useAttempt(attemptId)
  if (state.status === 'loading') return <Loading label="Loading your test…" />
  if (state.status === 'missing' || (state.status === 'ready' && state.items.length === 0)) {
    return <NotFoundPage />
  }
  if (state.status === 'error') {
    return (
      <div role="alert">
        <h1 className="text-[28px] leading-tight font-bold">Couldn’t load this test</h1>
        <p className="mt-2 text-ink-muted">Check your connection and reload the page.</p>
      </div>
    )
  }
  if (state.attempt.status === 'submitted') {
    return <Navigate to={`/attempt/${attemptId}/results`} replace />
  }
  return <Runner key={state.attempt.id} attempt={state.attempt} items={state.items} />
}

/** @param {{ attempt: Attempt, items: LoadedItem[] }} props */
function Runner({ attempt, items }) {
  const navigate = useNavigate()
  const cert = getCert(attempt.certId)
  const exam = attempt.mode === 'exam'
  const [initialIndex] = useState(() =>
    Math.min(Math.max(attempt.currentIndex, 0), items.length - 1),
  )
  const [index, setIndex] = useState(initialIndex)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useSessionStore((state) => state.pendingSelection)

  useEffect(() => {
    useSessionStore.getState().start(attempt.id, initialIndex)
    return () => useSessionStore.getState().reset()
  }, [attempt.id, initialIndex])

  const item = items[index]
  const order = attempt.optionOrder[item.id] ?? item.options.map((option) => option.id)
  const response = attempt.responses[item.id]
  const locked = response?.submitted === true
  // Study mode keeps an unsubmitted choice in the session store; Exam mode saves every change.
  const selected = locked || exam ? (response?.selected ?? []) : pending
  const complete = selected.length === item.selectCount
  const answeredCount = items.filter(
    (candidate) => (attempt.responses[candidate.id]?.selected.length ?? 0) > 0,
  ).length

  /** @param {unknown} cause */
  function reportSaveError(cause) {
    console.error('Failed to save', cause)
    setError('Couldn’t save your answer. Your browser may be blocking storage.')
  }

  /** @param {number} next */
  function goTo(next) {
    if (next < 0 || next >= items.length || next === index) return
    setError('')
    setIndex(next)
    useSessionStore.getState().goTo(next)
    saveCurrentIndex(attempt.id, next).catch(reportSaveError)
  }

  /** @param {string} optionId */
  function toggle(optionId) {
    if (locked || busy) return
    if (exam) {
      saveSelection(
        attempt.id,
        item,
        nextSelection(selected, optionId, item.selectCount),
        index,
      ).catch(reportSaveError)
    } else {
      useSessionStore.getState().toggleOption(optionId, item.selectCount)
    }
  }

  async function submitAnswer() {
    if (exam || locked || !complete || busy) return
    setBusy(true)
    setError('')
    try {
      await lockAnswer(attempt.id, item, selected, index)
    } catch (cause) {
      reportSaveError(cause)
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    if (busy) return
    setBusy(true)
    try {
      await finishAttempt(attempt.id, items)
      navigate(`/attempt/${attempt.id}/results`, { replace: true })
    } catch (cause) {
      console.error('Failed to finish', cause)
      setError('Couldn’t submit the test. Please try again.')
      setBusy(false)
    }
  }

  function confirmFinish() {
    const unanswered = items.length - answeredCount
    const action = exam ? 'Submit the exam' : 'Finish the test'
    const message =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. They will count as wrong. ${action} anyway?`
        : `${action} now?${exam ? ' You can’t change your answers afterwards.' : ''}`
    if (window.confirm(message)) finish()
  }

  // Re-registered every render so the handler always sees the current question.
  useEffect(() => {
    /** @param {KeyboardEvent} event */
    function onKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement) {
        const typing =
          target.isContentEditable ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          (target instanceof HTMLInputElement && !['radio', 'checkbox'].includes(target.type))
        if (typing) return
      }
      if (event.key.length !== 1 && event.key !== 'Enter') return
      const key = event.key.toLowerCase()
      if (key === 'enter') {
        // On a button or link, Enter already means "click it".
        if (target instanceof HTMLElement && ['BUTTON', 'A'].includes(target.tagName)) return
        if (!exam && !locked && complete) {
          event.preventDefault()
          submitAnswer()
        }
        return
      }
      if (key === 'n') {
        goTo(index + 1)
        return
      }
      const position = 'abcdef'.includes(key) ? 'abcdef'.indexOf(key) : '123456'.indexOf(key)
      if (position >= 0 && order[position]) toggle(order[position])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const marked = response?.markedForReview === true
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-bold">{TEST_KIND_LABELS[attempt.kind]}</h1>
          <p className="mt-1 text-ink-muted">
            {cert?.code} · {exam ? 'Exam mode' : 'Study mode'} · Answered {answeredCount} of{' '}
            {items.length}
          </p>
        </div>
        {exam && attempt.deadlineAt !== null && (
          <Timer deadlineAt={attempt.deadlineAt} onExpire={finish} />
        )}
      </div>

      <div className="mt-6">
        <QuestionCard item={item} index={index} total={items.length}>
          <OptionList
            item={item}
            order={order}
            selected={selected}
            locked={locked}
            onToggle={toggle}
          />
        </QuestionCard>

        {locked && !exam && (
          <ExplanationPanel
            key={item.id}
            item={item}
            order={order}
            selected={selected}
            correct={response?.correct === true}
            focusOnMount
          />
        )}

        {error && (
          <p role="alert" className="mt-4 text-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className={buttonClass('secondary')}
          >
            Previous
          </button>
          {!exam && !locked && (
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!complete || busy}
              className={buttonClass('primary')}
            >
              Submit answer
            </button>
          )}
          {exam && (
            <button
              type="button"
              aria-pressed={marked}
              onClick={() => toggleMarked(attempt.id, item.id, index).catch(reportSaveError)}
              className={`${buttonClass('secondary')} ${marked ? 'border-warning' : ''}`}
            >
              Mark for review
            </button>
          )}
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === items.length - 1}
            className={buttonClass(locked && !exam ? 'primary' : 'secondary')}
          >
            Next question
          </button>
          <button
            type="button"
            onClick={confirmFinish}
            disabled={busy}
            className={buttonClass('secondary')}
          >
            {exam ? 'Submit exam' : 'Finish test'}
          </button>
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          Keyboard: A–F or 1–6 choose an answer{exam ? '' : ', Enter submits'}, N goes to the next
          question.
        </p>
      </div>

      {exam && (
        <div className="mt-8">
          <QuestionNavigator
            itemIds={attempt.itemIds}
            responses={attempt.responses}
            currentIndex={index}
            onGo={goTo}
          />
        </div>
      )}
    </>
  )
}
