import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startTest } from '../../engine/startTest.js'
import { defaultLength, isExamKind, lengthChoices } from '../../engine/testConfig.js'
import { TEST_KIND_LABELS } from '../../engine/testKinds.js'
import { buttonClass } from '../ui/styles.js'

/** @typedef {import('../../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../../db/types.js').AttemptMode} AttemptMode */
/** @typedef {import('../../engine/testConfig.js').TestScope} TestScope */

/** @type {{ value: AttemptMode, label: string }[]} */
const MODES = [
  { value: 'exam', label: 'Exam mode' },
  { value: 'study', label: 'Study mode' },
]

/**
 * Length and mode choices before a test. Start creates the attempt and opens the runner.
 * @param {{ cert: CertSummary, kind: AttemptKind, scope: TestScope }} props
 */
export default function TestSetupForm({ cert, kind, scope }) {
  const examKind = isExamKind(kind)
  const choices = isExamKind(kind) ? [] : lengthChoices(kind, scope.poolSize)
  const [length, setLength] = useState(
    isExamKind(kind) ? cert.exam.questions : defaultLength(kind, scope.poolSize),
  )
  const [mode, setMode] = useState(/** @type {AttemptMode} */ (examKind ? 'exam' : 'study'))
  const idPrefix = useId()
  const minutes = cert.exam.minutes
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  /** @param {import('react').FormEvent} event */
  async function handleStart(event) {
    event.preventDefault()
    if (length === null) return
    setError('')
    setStarting(true)
    try {
      const attempt = await startTest({
        cert,
        kind,
        scopeId: scope.scopeId,
        length,
        mode: examKind ? mode : 'study',
      })
      navigate(`/attempt/${attempt.id}`)
    } catch (cause) {
      console.error('Failed to start the test', cause)
      setError('Couldn’t start the test. Please try again.')
      setStarting(false)
    }
  }

  /** @type {Record<AttemptMode, string>} */
  const modeHints = {
    exam: `Timed (${minutes} minutes). See your answers and explanations at the end.`,
    study: 'Untimed. See the answer and explanation after each question.',
  }
  const notice = !examKind
    ? 'Untimed. You’ll see the answer and explanation after each question.'
    : mode === 'exam'
      ? `A ${minutes}-minute timer starts when you begin. The exam submits itself when time runs out.`
      : 'Study mode has no timer.'

  return (
    <>
      <h1 className="text-3xl font-bold">{TEST_KIND_LABELS[kind]}</h1>
      <p className="mt-2 text-ink-muted">{scope.label}</p>
      <form className="mt-6 max-w-xl space-y-6" onSubmit={handleStart}>
        {examKind ? (
          <p>{cert.exam.questions} questions, weighted by domain like the real exam.</p>
        ) : (
          <fieldset>
            <legend className="font-semibold">Number of questions</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {choices.map(({ value, available }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 rounded border px-3 py-2 ${available ? 'cursor-pointer border-line-strong' : 'border-line text-ink-muted'}`}
                >
                  <input
                    type="radio"
                    name="length"
                    value={value}
                    checked={length === value}
                    disabled={!available}
                    onChange={() => setLength(value)}
                  />
                  {value}
                </label>
              ))}
            </div>
            {choices.some((choice) => !choice.available) && (
              <p className="mt-2 text-sm text-ink-muted">
                Only {scope.poolSize} questions are available here, so longer tests are turned off.
              </p>
            )}
          </fieldset>
        )}

        {examKind && (
          <fieldset>
            <legend className="font-semibold">Mode</legend>
            <div className="mt-2 space-y-3">
              {MODES.map((option) => (
                <div key={option.value}>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="mode"
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => setMode(option.value)}
                      aria-describedby={`${idPrefix}-${option.value}`}
                    />
                    {option.label}
                  </label>
                  <p id={`${idPrefix}-${option.value}`} className="ml-6 text-sm text-ink-muted">
                    {modeHints[option.value]}
                  </p>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <p aria-live="polite">{notice}</p>

        <div>
          <button
            type="submit"
            disabled={starting || length === null}
            className={buttonClass('primary')}
          >
            {starting ? 'Starting…' : `Start ${TEST_KIND_LABELS[kind]}`}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-error">
              {error}
            </p>
          )}
        </div>
      </form>
    </>
  )
}
