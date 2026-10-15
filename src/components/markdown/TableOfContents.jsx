/** @typedef {import('./headings.js').TocEntry} TocEntry */

/**
 * In-page links for a lesson. Uses focus() and scrollIntoView() instead of following
 * "#id", which HashRouter would treat as a route.
 * @param {{ entries: TocEntry[] }} props
 */
export default function TableOfContents({ entries }) {
  if (entries.length === 0) return null
  return (
    <nav aria-labelledby="toc-heading" className="text-sm">
      <h2 id="toc-heading" className="font-semibold">
        On this page
      </h2>
      <ul className="mt-2 space-y-1">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? 'pl-4' : ''}>
            <a
              href={`#${entry.id}`}
              onClick={(event) => {
                event.preventDefault()
                const target = document.getElementById(entry.id)
                target?.scrollIntoView({ block: 'start' })
                target?.focus({ preventScroll: true })
              }}
              className="text-ink-muted underline-offset-2 hover:text-accent hover:underline"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
