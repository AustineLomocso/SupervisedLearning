import { useUiStore } from '../../stores/useUiStore.js'

/** Shown when a deploy has replaced the files this tab was loaded from (see lib/staleChunks.js). */
export default function UpdateBanner() {
  const updateAvailable = useUiStore((state) => state.updateAvailable)
  if (!updateAvailable) return null
  return (
    <output className="flex items-center justify-center gap-3 bg-sky-100 px-4 py-3 text-center text-sm text-sky-900 dark:bg-sky-900/40 dark:text-sky-100">
      A new version of the app is available.
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded bg-sky-900 px-3 py-1 font-medium text-white dark:bg-sky-100 dark:text-sky-900"
      >
        Reload
      </button>
    </output>
  )
}
