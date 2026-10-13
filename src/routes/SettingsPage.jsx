import { useEffect, useState } from 'react'
import { getPersistenceStatus, requestPersistence } from '../db/persist.js'
import { useUiStore } from '../stores/useUiStore.js'

/** @typedef {import('../db/persist.js').PersistenceStatus} PersistenceStatus */

/** @type {{ value: import('../stores/useUiStore.js').Theme, label: string }[]} */
const THEME_OPTIONS = [
  { value: 'system', label: 'Match my device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** @type {Record<PersistenceStatus, string>} */
const STORAGE_STATUS_TEXT = {
  persisted: 'Protected. Your browser won’t clear your progress to free up space.',
  'best-effort':
    'Not protected. Your browser may clear your progress if the device runs low on storage.',
  unsupported: 'This browser can’t protect stored progress.',
}

export default function SettingsPage() {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const [storageStatus, setStorageStatus] = useState(/** @type {PersistenceStatus | null} */ (null))

  useEffect(() => {
    let cancelled = false
    getPersistenceStatus().then((status) => {
      if (!cancelled) setStorageStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <h1 className="text-3xl font-bold">Settings</h1>

      <section aria-labelledby="appearance-heading" className="mt-8">
        <h2 id="appearance-heading" className="text-xl font-semibold">
          Appearance
        </h2>
        <fieldset className="mt-3">
          <legend className="text-sm text-slate-600 dark:text-slate-300">Theme</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {THEME_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="storage-heading" className="mt-8">
        <h2 id="storage-heading" className="text-xl font-semibold">
          Storage
        </h2>
        <p className="mt-2" aria-live="polite">
          {storageStatus ? STORAGE_STATUS_TEXT[storageStatus] : 'Checking storage…'}
        </p>
        {storageStatus === 'best-effort' && (
          <button
            type="button"
            onClick={async () => setStorageStatus(await requestPersistence())}
            className="mt-3 rounded bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Ask the browser to keep my progress
          </button>
        )}
      </section>
    </>
  )
}
