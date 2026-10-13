/**
 * "persisted": the browser will not evict IndexedDB under storage pressure.
 * "best-effort": data may be evicted when the device runs low on space.
 * @typedef {'persisted' | 'best-effort' | 'unsupported'} PersistenceStatus
 */

/** @returns {Promise<PersistenceStatus>} */
export async function getPersistenceStatus() {
  if (!navigator.storage?.persisted) return 'unsupported'
  return (await navigator.storage.persisted()) ? 'persisted' : 'best-effort'
}

/**
 * Asks the browser to keep this site's data. Called after the learner's first submitted
 * attempt (Phase 4) and from Settings.
 * @returns {Promise<PersistenceStatus>}
 */
export async function requestPersistence() {
  if (!navigator.storage?.persist || !navigator.storage.persisted) return 'unsupported'
  if (await navigator.storage.persisted()) return 'persisted'
  return (await navigator.storage.persist()) ? 'persisted' : 'best-effort'
}
