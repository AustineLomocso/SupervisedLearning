import ReactMarkdown from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import MermaidBlock from './MermaidBlock.jsx'

/** @typedef {import('hast').Element} HastElement */
/** @typedef {import('hast').ElementContent} HastContent */

/**
 * @param {HastContent} node
 * @returns {string}
 */
function textOf(node) {
  if (node.type === 'text') return node.value
  return 'children' in node ? node.children.map(textOf).join('') : ''
}

/**
 * The diagram source when this <pre> holds a ```mermaid fence, otherwise null.
 * @param {HastElement | undefined} pre
 */
function mermaidSource(pre) {
  const code = pre?.children[0]
  if (code?.type !== 'element' || code.tagName !== 'code') return null
  const classes = code.properties.className
  return Array.isArray(classes) && classes.includes('language-mermaid') ? textOf(code) : null
}

// Only the props each element needs are passed through. Never spread react-markdown's `node`
// onto the DOM.
/** @type {import('react-markdown').Components} */
const COMPONENTS = {
  pre({ node, children }) {
    const diagram = mermaidSource(node)
    return diagram === null ? <pre>{children}</pre> : <MermaidBlock code={diagram} />
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children} <span className="sr-only">(opens in a new tab)</span>
      </a>
    )
  },
  h2({ id, children }) {
    return (
      <h2 id={id} tabIndex={-1}>
        {children}
      </h2>
    )
  },
  h3({ id, children }) {
    return (
      <h3 id={id} tabIndex={-1}>
        {children}
      </h3>
    )
  },
  table({ children }) {
    return (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    )
  },
}

/**
 * Renders authored Markdown: GFM tables, Mermaid diagrams, slugged heading ids. Raw HTML in
 * the source is dropped, not rendered.
 * @param {{ children: string }} props
 */
export default function Markdown({ children }) {
  return (
    <div className="lesson">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
