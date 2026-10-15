import { useUiStore } from '../stores/useUiStore.js'

/**
 * After a deploy, a tab opened earlier asks for chunk files whose hashed names no longer
 * exist. Vite reports that as "vite:preloadError". We only flag it, so the UpdateBanner
 * can offer a reload; the event is not cancelled, so the failing page still shows
 * RouteError, which says the same thing.
 * @returns {() => void} stop listening
 */
export function watchForStaleChunks() {
  const onError = () => useUiStore.setState({ updateAvailable: true })
  window.addEventListener('vite:preloadError', onError)
  return () => window.removeEventListener('vite:preloadError', onError)
}
