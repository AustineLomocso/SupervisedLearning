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
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-6xl px-4 pt-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-ink-muted">
        <li>
          <Link to="/" className="text-accent underline-offset-2 hover:underline">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={crumb.to} className="flex items-center gap-1">
            <span aria-hidden="true" className="before:content-['›']" />
            {index === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-ink-heading">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.to} className="text-accent underline-offset-2 hover:underline">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
