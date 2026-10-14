import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { loadItems } from '../content/loadItems.js'
import { getAttempt } from '../db/attempts.js'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/**
 * @typedef {{ status: 'loading' }
 *   | { status: 'missing' }
 *   | { status: 'error' }
 *   | { status: 'ready', attempt: Attempt, items: LoadedItem[] }} AttemptState
 */

/**
 * A live attempt (re-renders as answers are saved) plus its questions, loaded once.
 * @param {string} attemptId
 * @returns {AttemptState}
 */
export function useAttempt(attemptId) {
  // null = no such attempt; undefined = still reading.
  const attempt = useLiveQuery(() => getAttempt(attemptId).then((row) => row ?? null), [attemptId])
  const certId = attempt?.certId
  // Item ids never change for an attempt; keying on them avoids reloading on every answer.
  const itemKey = attempt ? attempt.itemIds.join('|') : null
  const [loaded, setLoaded] = useState(
    /** @type {{ key: string, items?: LoadedItem[] } | null} */ (null),
  )

  useEffect(() => {
    if (!certId || !itemKey) return
    let cancelled = false
    loadItems(certId, itemKey.split('|')).then(
      (items) => {
        if (!cancelled) setLoaded({ key: itemKey, items })
      },
      (error) => {
        console.error('Failed to load questions', error)
        if (!cancelled) setLoaded({ key: itemKey })
      },
    )
    return () => {
      cancelled = true
    }
  }, [certId, itemKey])

  if (attempt === undefined) return { status: 'loading' }
  if (attempt === null) return { status: 'missing' }
  if (loaded?.key !== itemKey) return { status: 'loading' }
  return loaded.items ? { status: 'ready', attempt, items: loaded.items } : { status: 'error' }
}
