import { useEffect, useId, useRef, useState } from 'react'
import { useIsDark } from '../../hooks/useIsDark.js'

/** @typedef {typeof import('mermaid').default} Mermaid */
/** @typedef {{ status: 'loading' } | { status: 'ready', svg: string } | { status: 'error' }} DiagramState */

/** Start drawing a little before the diagram scrolls into view. */
const NEAR_VIEWPORT_MARGIN = '200px'

/** @type {Promise<Mermaid> | null} */
let mermaidModule = null

/** Mermaid is large, so it is downloaded only when the first diagram comes near the screen. */
function loadMermaid() {
  if (!mermaidModule) {
    mermaidModule = import('mermaid').then((module) => module.default)
    // Forget a failed download (e.g. offline) so the next diagram retries.
    mermaidModule.catch(() => {
      mermaidModule = null
    })
  }
  return mermaidModule
}

/**
 * True once the element is within NEAR_VIEWPORT_MARGIN of the viewport (and stays true).
 * Without IntersectionObserver (old browsers, jsdom) it is true straight away.
 * @param {import('react').RefObject<Element | null>} ref
 */
function useNearViewport(ref) {
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (near || !element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: NEAR_VIEWPORT_MARGIN },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near, ref])
  return near
}

/**
 * Renders a ```mermaid fence as an SVG diagram in the current theme. Drawing is deferred
 * until the diagram nears the screen: Mermaid's download and layout block the main thread
 * for hundreds of milliseconds, which a learner reading the top of a lesson doesn't need yet.
 * Lesson authors are trusted, and securityLevel "strict" still strips scripts and click
 * handlers.
 * @param {{ code: string }} props
 */
export default function MermaidBlock({ code }) {
  const dark = useIsDark()
  // Mermaid uses the id in CSS selectors, so strip the punctuation React puts in useId values.
  const id = `mermaid-${useId().replace(/[^\w-]/g, '')}`
  const placeholderRef = useRef(/** @type {HTMLElement | null} */ (null))
  const near = useNearViewport(placeholderRef)
  const [state, setState] = useState(/** @type {DiagramState} */ ({ status: 'loading' }))

  useEffect(() => {
    if (!near) return
    let cancelled = false
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'default',
        })
        const { svg } = await mermaid.render(id, code)
        if (!cancelled) setState({ status: 'ready', svg })
      })
      .catch((error) => {
        console.error('Failed to draw diagram', error)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [near, code, dark, id])

  if (state.status === 'loading') {
    // Holds roughly a diagram's height so the text below doesn't jump when it is drawn.
    return (
      <figure
        ref={placeholderRef}
        className="mermaid-diagram mt-4 flex min-h-64 items-center justify-center rounded border border-dashed border-line-strong text-sm text-ink-muted"
      >
        Loading diagram…
      </figure>
    )
  }
  if (state.status === 'error') {
    return (
      <figure className="mt-4">
        <pre>
          <code>{code}</code>
        </pre>
        <figcaption className="mt-1 text-sm text-ink-muted">
          This diagram couldn’t be drawn, so its source is shown instead.
        </figcaption>
      </figure>
    )
  }
  return (
    <figure
      className="mermaid-diagram mt-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  )
}
