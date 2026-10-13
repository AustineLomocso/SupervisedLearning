import { Link, useMatches } from 'react-router-dom'

/**
 * Routes opt in by setting `handle: { crumb: (params) => label }` (see router.jsx).
 * @typedef {{ crumb?: (params: import('react-router-dom').Params<string>) => string | null }} CrumbHandle
 */

export default function Breadcrumbs() {
  const crumbs = useMatches().flatMap((match) => {
    const handle = /** @type {CrumbHandle | undefined} */ (match.handle)
    const label = handle?.crumb?.(match.params)
    return label ? [{ label, to: match.pathname }] : []
  })

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-5xl px-4 pt-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-slate-600 dark:text-slate-400">
        <li>
          <Link to="/" className="underline-offset-2 hover:underline">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={crumb.to} className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            {index === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-slate-900 dark:text-slate-100">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.to} className="underline-offset-2 hover:underline">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
