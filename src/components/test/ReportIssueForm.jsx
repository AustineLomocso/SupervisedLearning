import { useState } from 'react'
import { addFlag, FLAG_REASON_LABELS, FLAG_REASONS } from '../../db/flags.js'
import { buttonClass } from '../ui/styles.js'

/**
 * "Report issue": an inline form that saves a report in this browser (see Settings → My
 * reports to export them).
 * @param {{ item: import('../../content/types.js').LoadedItem }} props
 */
export default function ReportIssueForm({ item }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(
    /** @type {import('../../db/types.js').FlagReason | null} */ (null),
  )
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(
    /** @type {'idle' | 'saving' | 'saved' | 'error'} */ ('idle'),
  )

  if (status === 'saved') {
    return (
      <output className="mt-4 block text-sm">
        Thanks. Your report was saved in this browser. Export it from Settings to share it.
      </output>
    )
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${buttonClass('secondary')} mt-4`}
      >
        Report issue
      </button>
    )
  }

  /** @param {import('react').FormEvent} event */
  async function handleSubmit(event) {
    event.preventDefault()
    if (!reason) return
    setStatus('saving')
    try {
      await addFlag({
        itemId: item.id,
        itemVersion: item.version,
        certId: item.certId,
        reason,
        note,
      })
      setStatus('saved')
    } catch (error) {
      console.error('Failed to save report', error)
      setStatus('error')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-2xl bg-surface p-4 shadow-container"
    >
      <fieldset>
        <legend className="font-semibold">What’s wrong with this question?</legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {FLAG_REASONS.map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name={`reason-${item.id}`}
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
              />
              {FLAG_REASON_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="font-semibold">Details (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border-2 border-line-strong bg-surface p-2 text-ink focus:border-accent"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!reason || status === 'saving'}
          className={buttonClass('primary')}
        >
          Send report
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass('secondary')}>
          Cancel
        </button>
      </div>
      {status === 'error' && (
        <p role="alert" className="text-error">
          Couldn’t save your report. Your browser may be blocking storage.
        </p>
      )}
    </form>
  )
}
