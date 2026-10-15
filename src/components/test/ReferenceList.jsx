/**
 * @param {{ references: import('../../content/types.js').Reference[] }} props
 */
export default function ReferenceList({ references }) {
  if (references.length === 0) return null
  return (
    <div className="mt-4">
      <h4 className="font-semibold">Learn more</h4>
      <ul className="mt-1 list-disc pl-6">
        {references.map((reference) => (
          <li key={reference.url}>
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              {reference.title} <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
