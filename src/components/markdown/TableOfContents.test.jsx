import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { readHeadings } from './headings.js'
import TableOfContents from './TableOfContents.jsx'

describe('readHeadings', () => {
  it('collects h2 and h3 headings that have ids', () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<h1 id="t">Title</h1><h2 id="a">A</h2><h3 id="b">B</h3><h2>No id</h2><h4 id="c">C</h4>'
    expect(readHeadings(container)).toEqual([
      { id: 'a', text: 'A', level: 2 },
      { id: 'b', text: 'B', level: 3 },
    ])
  })
})

describe('TableOfContents', () => {
  it('moves focus to the heading without changing the route', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <TableOfContents entries={[{ id: 'key-terms', text: 'Key terms', level: 2 }]} />
        <h2 id="key-terms" tabIndex={-1}>
          Key terms
        </h2>
      </>,
    )
    await user.click(screen.getByRole('link', { name: 'Key terms' }))
    expect(screen.getByRole('heading', { name: 'Key terms', level: 2 })).toHaveFocus()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(window.location.hash).toBe('')
  })

  it('renders nothing without entries', () => {
    const { container } = render(<TableOfContents entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
