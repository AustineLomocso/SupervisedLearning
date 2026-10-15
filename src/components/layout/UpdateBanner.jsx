import { useUiStore } from '../../stores/useUiStore.js'

/** Shown when a deploy has replaced the files this tab was loaded from (see lib/staleChunks.js). */
export default function UpdateBanner() {
  const updateAvailable = useUiStore((state) => state.updateAvailable)
  if (!updateAvailable) return null
  return (
    <output className="flex items-center justify-center gap-3 bg-info-bg px-4 py-3 text-center text-sm text-ink">
      A new version of the app is available.
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full bg-accent px-3 py-1 font-bold text-on-accent"
      >
        Reload
      </button>
    </output>
  )
}
