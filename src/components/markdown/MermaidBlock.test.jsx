import { act, render, screen, waitFor } from '@testing-library/react'
import mermaid from 'mermaid'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MermaidBlock from './MermaidBlock.jsx'

vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: vi.fn() } }))

const CODE = 'flowchart TD\n  A --> B'

beforeEach(() => {
  vi.mocked(mermaid.initialize).mockClear()
  vi.mocked(mermaid.render)
    .mockReset()
    .mockImplementation(async (id) => ({ svg: `<svg data-testid="diagram" id="${id}"></svg>` }))
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
  vi.restoreAllMocks()
})

describe('MermaidBlock', () => {
  it('draws the diagram with the light theme and strict security', async () => {
    render(<MermaidBlock code={CODE} />)
    expect(screen.getByText('Loading diagram…')).toBeInTheDocument()
    expect(await screen.findByTestId('diagram')).toBeInTheDocument()
    expect(mermaid.initialize).toHaveBeenLastCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    })
    expect(mermaid.render).toHaveBeenCalledWith(expect.stringMatching(/^mermaid-[\w-]+$/), CODE)
  })

  it('redraws with the dark theme when the theme changes', async () => {
    render(<MermaidBlock code={CODE} />)
    await screen.findByTestId('diagram')
    act(() => document.documentElement.classList.add('dark'))
    await waitFor(() =>
      expect(mermaid.initialize).toHaveBeenLastCalledWith(
        expect.objectContaining({ theme: 'dark' }),
      ),
    )
  })

  it('shows the source when the diagram cannot be drawn', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<MermaidBlock code={CODE} />)
    expect(await screen.findByText(/couldn’t be drawn/)).toBeInTheDocument()
    expect(screen.getByText(/A --> B/)).toBeInTheDocument()
  })
})

describe('MermaidBlock below the fold', () => {
  /** A stand-in IntersectionObserver whose callback the test triggers by hand. */
  class FakeObserver {
    /** @type {FakeObserver[]} */
    static instances = []

    /**
     * @param {(entries: { isIntersecting: boolean }[]) => void} callback
     * @param {IntersectionObserverInit} options
     */
    constructor(callback, options) {
      this.callback = callback
      this.options = options
      this.observe = vi.fn()
      this.disconnect = vi.fn()
      FakeObserver.instances.push(this)
    }

    /** @param {boolean} isIntersecting */
    fire(isIntersecting) {
      act(() => this.callback([{ isIntersecting }]))
    }
  }

  beforeEach(() => {
    FakeObserver.instances = []
    vi.stubGlobal('IntersectionObserver', FakeObserver)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('waits to draw until the diagram comes near the screen', async () => {
    render(<MermaidBlock code={CODE} />)
    const placeholder = screen.getByText('Loading diagram…')
    const [observer] = FakeObserver.instances
    expect(observer.options).toEqual({ rootMargin: '200px' })
    expect(observer.observe).toHaveBeenCalledWith(placeholder)

    observer.fire(false)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(mermaid.render).not.toHaveBeenCalled()

    observer.fire(true)
    expect(await screen.findByTestId('diagram')).toBeInTheDocument()
    expect(observer.disconnect).toHaveBeenCalled()
  })

  it('reserves space for the diagram while it waits', () => {
    render(<MermaidBlock code={CODE} />)
    const placeholder = screen.getByText('Loading diagram…')
    expect(placeholder.tagName).toBe('FIGURE')
    expect(placeholder).toHaveClass('mermaid-diagram', 'min-h-64')
  })
})
