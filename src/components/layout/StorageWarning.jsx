import { useUiStore } from '../../stores/useUiStore.js'

export default function StorageWarning() {
  const storageError = useUiStore((state) => state.storageError)
  if (!storageError) return null
  return (
    <div role="alert" className="bg-warning-bg px-4 py-3 text-center text-sm text-ink">
      Your browser blocked local storage, so your progress can’t be saved. Private browsing modes
      often do this.
    </div>
  )
}
