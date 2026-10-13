import { useEffect, useId, useState } from 'react'
import { useIsDark } from '../../hooks/useIsDark.js'

/** @typedef {typeof import('mermaid').default} Mermaid */
/** @typedef {{ status: 'loading' } | { status: 'ready', svg: string } | { status: 'error' }} DiagramState */

/** @type {Promise<Mermaid> | null} */
let mermaidModule = null

/** Mermaid is large, so it is downloaded only when a diagram is actually on screen. */
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
 * Renders a ```mermaid fence as an SVG diagram in the current theme. Lesson authors are
 * trusted, and securityLevel "strict" still strips scripts and click handlers.
 * @param {{ code: string }} props
 */
export default function MermaidBlock({ code }) {
  const dark = useIsDark()
  // Mermaid uses the id in CSS selectors, so strip the punctuation React puts in useId values.
  const id = `mermaid-${useId().replace(/[^\w-]/g, '')}`
  const [state, setState] = useState(/** @type {DiagramState} */ ({ status: 'loading' }))

  useEffect(() => {
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
  }, [code, dark, id])

  if (state.status === 'loading') {
    return <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading diagram…</p>
  }
  if (state.status === 'error') {
    return (
      <figure className="mt-4">
        <pre>
          <code>{code}</code>
        </pre>
        <figcaption className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
