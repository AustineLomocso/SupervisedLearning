import { useEffect, useState } from 'react'
import { loadReview } from '../content/loadReview.js'

/** @typedef {{ status: 'loading' } | { status: 'ready', markdown: string } | { status: 'error' }} LessonState */

/** @type {LessonState} */
const LOADING = { status: 'loading' }

/**
 * Lazily loads a task's lesson Markdown.
 * @param {string} certId
 * @param {string | null} taskCode null when there is no lesson to load
 * @returns {LessonState}
 */
export function useLesson(certId, taskCode) {
  const key = taskCode ? `${certId}/${taskCode}` : null
  // Results are tagged with their key, so a stale lesson is never shown for a new task.
  const [result, setResult] = useState(
    /** @type {{ key: string, state: LessonState } | null} */ (null),
  )

  useEffect(() => {
    if (!key || !taskCode) return
    let cancelled = false
    loadReview(certId, taskCode).then(
      (markdown) => {
        if (!cancelled) setResult({ key, state: { status: 'ready', markdown } })
      },
      (error) => {
        console.error('Failed to load lesson', error)
        if (!cancelled) setResult({ key, state: { status: 'error' } })
      },
    )
    return () => {
      cancelled = true
    }
  }, [certId, taskCode, key])

  return result && result.key === key ? result.state : LOADING
}
