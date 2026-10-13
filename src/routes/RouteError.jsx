import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

/** Shown when a page throws or its lazy chunk fails to load (e.g. right after a deploy). */
export default function RouteError() {
  const error = useRouteError()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        The page failed to load. Reloading usually fixes this, especially right after the app has
        been updated.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
      >
        Reload
      </button>
    </div>
  )
}
