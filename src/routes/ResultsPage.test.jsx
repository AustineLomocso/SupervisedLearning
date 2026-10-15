import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAttempt } from '../db/attempts.js'
import { finishAttempt, saveSelection, toggleMarked } from '../db/session.js'
import { makeItem, makeMultiItem } from '../test/itemFactories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

vi.mock('../content/loadItems.js', async () => {
  const { makeItem, makeMultiItem } = await import('../test/itemFactories.js')
  const items = [
    makeItem({ id: 'clf-c02-1.1-0001', taskCode: '1.1' }),
    makeMultiItem({ id: 'clf-c02-1.1-0002', taskCode: '1.1' }),
    makeItem({
      id: 'clf-c02-2.1-0003',
      taskCode: '2.1',
      stem: 'Which service runs virtual servers?',
    }),
  ]
  return {
    loadItems: async (_certId, ids) => ids.map((id) => items.find((item) => item.id === id)),
    getSubdomainItemIds: async () => [],
    getCertIndex: async () => ({}),
  }
})

const ITEMS = [
  makeItem({ id: 'clf-c02-1.1-0001', taskCode: '1.1' }),
  makeMultiItem({ id: 'clf-c02-1.1-0002', taskCode: '1.1' }),
  makeItem({ id: 'clf-c02-2.1-0003', taskCode: '2.1' }),
]
const ORDER = {
  'clf-c02-1.1-0001': ['a', 'b', 'c', 'd'],
  'clf-c02-1.1-0002': ['a', 'b', 'c', 'd', 'e'],
  'clf-c02-2.1-0003': ['a', 'b', 'c', 'd'],
}

/**
 * A finished attempt: Q1 right, Q2 wrong and marked for review, Q3 unanswered.
 * @param {import('../db/types.js').AttemptKind} kind
 */
async function finished(kind) {
  const attempt = await createAttempt({
    certId: 'clf-c02',
    kind,
    scopeId: kind === 'diagnostic' ? 'clf-c02' : 'clf-c02/1.1',
    mode: 'exam',
    itemIds: ITEMS.map((item) => item.id),
    optionOrder: ORDER,
  })
  await saveSelection(attempt.id, ITEMS[0], ['a'], 0, 1_000)
  await saveSelection(attempt.id, ITEMS[1], ['a', 'b'], 1, 2_000)
  await toggleMarked(attempt.id, ITEMS[1].id, 1)
  await finishAttempt(attempt.id, ITEMS, attempt.startedAt + 725_000)
  return attempt
}

beforeEach(resetDb)

describe('ResultsPage', () => {
  it('shows the raw score and time for a Pre-Test, without a scaled score', async () => {
    const attempt = await finished('pre')
    renderRoute(`/attempt/${attempt.id}/results`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pre-Test results' }),
    ).toBeInTheDocument()
    expect(screen.getByText('You answered 1 of 3 correctly (33%).')).toBeInTheDocument()
    expect(screen.getByText(/12 min 5 s/)).toBeInTheDocument()
    expect(screen.queryByText(/scaled score/i)).not.toBeInTheDocument()
  })

  it('shows a labelled scaled-score estimate for a Diagnostic Exam', async () => {
    const attempt = await finished('diagnostic')
    renderRoute(`/attempt/${attempt.id}/results`)
    expect(await screen.findByText(/Estimated scaled score/)).toBeInTheDocument()
    expect(screen.getByText('383')).toBeInTheDocument()
    expect(screen.getByText(/This is an estimate/)).toBeInTheDocument()
    expect(screen.getByText(/Below the estimated pass mark of 700/)).toBeInTheDocument()
  })

  it('breaks the score down by domain and by task, with current mastery', async () => {
    const attempt = await finished('diagnostic')
    renderRoute(`/attempt/${attempt.id}/results`)
    const domains = await screen.findByRole('list', { name: 'Score by domain' })
    expect(domains).toHaveTextContent('Domain 1: Cloud Concepts')
    expect(domains).toHaveTextContent('1 of 2 correct (50%)')
    expect(domains).toHaveTextContent('Domain 2: Security and Compliance')
    expect(domains).toHaveTextContent('0 of 1 correct (0%)')
    const table = screen.getByRole('table', { name: 'Score by task' })
    const row = within(table).getByRole('row', { name: /1\.1/ })
    expect(row).toHaveTextContent('1 of 2')
    await waitFor(() => expect(row).toHaveTextContent('Developing'))
  })

  it('reviews every question and filters to incorrect or marked ones', async () => {
    const attempt = await finished('pre')
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}/results`)
    const all = await screen.findAllByRole('article')
    expect(all).toHaveLength(3)
    await user.click(screen.getByRole('radio', { name: 'Incorrect (2)' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await user.click(screen.getByRole('radio', { name: 'Marked for review (1)' }))
    const marked = screen.getAllByRole('article')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toHaveTextContent('Question 2')
  })

  it('explains each reviewed answer and says when a question was left blank', async () => {
    const attempt = await finished('pre')
    renderRoute(`/attempt/${attempt.id}/results`)
    const articles = await screen.findAllByRole('article')
    expect(articles[0]).toHaveTextContent('Correct')
    expect(articles[1]).toHaveTextContent('Incorrect')
    expect(within(articles[1]).getByText('Pay-as-you-go pricing')).toBeInTheDocument()
    expect(articles[2]).toHaveTextContent('Unanswered')
    expect(within(articles[2]).getByText('EBS is block storage for EC2.')).toBeInTheDocument()
  })

  it('offers a drill on weak areas', async () => {
    const attempt = await finished('pre')
    renderRoute(`/attempt/${attempt.id}/results`)
    expect(await screen.findByRole('link', { name: 'Drill weak areas' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=drill',
    )
  })

  it('sends an unfinished attempt back to the runner', async () => {
    const attempt = await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ITEMS.map((item) => item.id),
      optionOrder: ORDER,
    })
    const router = renderRoute(`/attempt/${attempt.id}/results`)
    await waitFor(() => expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}`))
  })
})
