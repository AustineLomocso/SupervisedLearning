import { useUiStore } from '../../stores/useUiStore.js'

export default function StorageWarning() {
  const storageError = useUiStore((state) => state.storageError)
  if (!storageError) return null
  return (
    <div
      role="alert"
      className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
    >
      Your browser blocked local storage, so your progress can’t be saved. Private browsing modes
      often do this.
    </div>
  )
}
