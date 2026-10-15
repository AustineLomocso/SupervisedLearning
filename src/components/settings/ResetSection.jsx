import { useState } from 'react'
import { resetProgress } from '../../db/backup.js'
import { buttonClass } from '../ui/styles.js'

export default function ResetSection() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function handleReset() {
    const confirmed = window.confirm(
      'Delete all test attempts, answer history and review checkmarks in this browser? This can’t be undone.',
    )
    if (!confirmed) return
    try {
      await resetProgress()
      setError('')
      setStatus('Progress reset.')
    } catch (cause) {
      console.error('Failed to reset progress', cause)
      setStatus('')
      setError('Couldn’t reset progress. Your browser may be blocking storage.')
    }
  }

  return (
    <section aria-labelledby="reset-heading" className="mt-8">
      <h2 id="reset-heading" className="text-lg font-bold">
        Reset progress
      </h2>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Deletes all test attempts, answer history and review checkmarks. Your reports and theme are
        kept. Download a backup first if you might want them back.
      </p>
      <button type="button" onClick={handleReset} className={`${buttonClass('danger')} mt-3`}>
        Reset progress
      </button>
      <output className="mt-2 block">{status}</output>
      {error && (
        <p role="alert" className="mt-2 text-error">
          {error}
        </p>
      )}
    </section>
  )
}
