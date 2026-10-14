import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProgress } from '../db/progress.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id) => ({ svg: `<svg data-testid="diagram" id="${id}"></svg>` })),
  },
}))

beforeEach(async () => {
  await resetDb()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ReviewPage', () => {
  it('renders the lesson with a table of contents and its diagram', async () => {
    renderRoute('/clf-c02/s/1.1/review')
    // The first lazy route + lesson chunk load can exceed the 1s default under cold transforms.
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Define the benefits of the AWS Cloud' },
        { timeout: 10000 },
      ),
    ).toBeInTheDocument()
    const toc = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(toc).getByRole('link', { name: 'Key concepts' })).toHaveAttribute(
      'href',
      '#key-concepts',
    )
    expect(await screen.findByTestId('diagram')).toBeInTheDocument()
  })

  it('marks the task as reviewed and promotes the Post-Test', async () => {
    const user = userEvent.setup()
    renderRoute('/clf-c02/s/1.1/review')
    await user.click(
      await screen.findByRole('button', { name: 'Mark as reviewed' }, { timeout: 10000 }),
    )
    expect(await screen.findByText(/^Marked as reviewed on/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).not.toBeInTheDocument()
    expect((await getProgress('clf-c02/1.1'))?.reviewCompletedAt).toEqual(expect.any(Number))
    expect(screen.getByRole('link', { name: 'Take the Post-Test' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=post&scope=1.1',
    )
  })
})
