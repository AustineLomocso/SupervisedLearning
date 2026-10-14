import { useId, useState } from 'react'
import { assertValidBackup, BackupError, exportBackup, importBackup } from '../../db/backup.js'
import { downloadJson, fileDateStamp } from '../../lib/download.js'
import { buttonClass } from '../ui/styles.js'

export default function BackupSection() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const inputId = useId()

  /** @param {string} text */
  function succeed(text) {
    setError('')
    setStatus(text)
  }

  /** @param {string} text */
  function fail(text) {
    setStatus('')
    setError(text)
  }

  async function handleExport() {
    try {
      downloadJson(`awsprep-backup-${fileDateStamp()}.json`, await exportBackup())
      succeed('Backup downloaded.')
    } catch (cause) {
      console.error('Failed to export backup', cause)
      fail('Couldn’t create the backup. Your browser may be blocking storage.')
    }
  }

  /** @param {import('react').ChangeEvent<HTMLInputElement>} event */
  async function handleImport(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = '' // so choosing the same file again still fires onChange
    if (!file) return
    try {
      /** @type {unknown} */
      let parsed
      try {
        parsed = JSON.parse(await file.text())
      } catch {
        throw new BackupError('The file is not valid JSON.')
      }
      assertValidBackup(parsed)
      const confirmed = window.confirm(
        'Replace all progress in this browser with this backup? This can’t be undone.',
      )
      if (!confirmed) return
      await importBackup(parsed)
      succeed('Progress restored from the backup.')
    } catch (cause) {
      if (cause instanceof BackupError) {
        fail(cause.message)
      } else {
        console.error('Failed to import backup', cause)
        fail('Couldn’t restore the backup.')
      }
    }
  }

  return (
    <section aria-labelledby="backup-heading" className="mt-8">
      <h2 id="backup-heading" className="text-xl font-semibold">
        Backup
      </h2>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Your progress lives only in this browser. Download a backup to keep it safe or to move it to
        another device. Restoring a backup replaces everything stored here.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleExport} className={buttonClass('primary')}>
          Download backup
        </button>
        <input
          id={inputId}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={`${buttonClass('secondary')} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-500`}
        >
          Restore from backup
        </label>
      </div>
      <output className="mt-2 block">{status}</output>
      {error && (
        <p role="alert" className="mt-2 text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}
