/**
 * Keyboard shortcut past the header. Uses focus() instead of the default "#main" jump
 * because HashRouter would treat "#main" as a route.
 * @param {{ targetRef: import('react').RefObject<HTMLElement | null> }} props
 */
export default function SkipLink({ targetRef }) {
  return (
    <a
      href="#main"
      onClick={(event) => {
        event.preventDefault()
        targetRef.current?.focus()
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
    >
      Skip to main content
    </a>
  )
}
