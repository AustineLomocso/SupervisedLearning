import { render, screen } from '@testing-library/react'
import mermaid from 'mermaid'
import { describe, expect, it, vi } from 'vitest'
import Markdown from './Markdown.jsx'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id) => ({ svg: `<svg data-testid="diagram" id="${id}"></svg>` })),
  },
}))

const SAMPLE = [
  '# Lesson title',
  '',
  '## Key terms',
  '',
  '| Term | Meaning |',
  '| ---- | ------- |',
  '| Region | A geographic area |',
  '',
  '## Learn more',
  '',
  '- [AWS docs](https://docs.aws.amazon.com/)',
  '',
  '```mermaid',
  'flowchart TD',
  '  A --> B',
  '```',
  '',
  '```text',
  'plain code',
  '```',
].join('\n')

describe('Markdown', () => {
  it('renders GFM tables and gives headings slug ids', () => {
    render(<Markdown>{SAMPLE}</Markdown>)
    expect(screen.getByRole('heading', { level: 1, name: 'Lesson title' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Key terms' })).toHaveAttribute(
      'id',
      'key-terms',
    )
    expect(screen.getByRole('table')).toHaveTextContent('A geographic area')
  })

  it('opens links in a new tab and says so', () => {
    render(<Markdown>{SAMPLE}</Markdown>)
    const link = screen.getByRole('link', { name: 'AWS docs (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://docs.aws.amazon.com/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('draws mermaid fences and leaves other code blocks alone', async () => {
    render(<Markdown>{SAMPLE}</Markdown>)
    expect(await screen.findByTestId('diagram')).toBeInTheDocument()
    expect(mermaid.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('A --> B'),
    )
    expect(screen.getByText('plain code').closest('pre')).toBeInTheDocument()
  })

  it('does not render raw HTML', () => {
    const { container } = render(<Markdown>{'<script>alert(1)</script> <b>bold</b>'}</Markdown>)
    expect(container.querySelector('script, b')).toBeNull()
  })
})
