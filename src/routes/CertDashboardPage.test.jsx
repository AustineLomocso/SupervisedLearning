import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAttempt, getAttempt, saveResponse } from '../db/attempts.js'
import { db } from '../db/db.js'
import { graded, makeAttempt } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('CertDashboardPage', () => {
  it('steers a new learner to the Diagnostic Exam and the heaviest domain', async () => {
    renderRoute('/clf-c02')
    expect(await screen.findByText(/Start with the Diagnostic Exam/)).toBeInTheDocument()
    const next = within(screen.getByRole('list', { name: 'Recommended next' }))
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(next).toEqual([
      expect.stringMatching(/^Task 3\.1:/),
      expect.stringMatching(/^Task 3\.2:/),
      expect.stringMatching(/^Task 3\.3:/),
    ])
  })

  it('shows mastery once questions have been answered', async () => {
    await db.attempts.add(makeAttempt({ responses: { 'clf-c02-1.1-0001': graded(true, 10) } }))
    renderRoute('/clf-c02')
    const cell = await screen.findByRole('link', { name: /^1\.1:/ })
    expect(cell).toHaveTextContent('Strong')
    expect(cell).toHaveTextContent('100%')
    expect(cell).toHaveTextContent('(few answers)')
    expect(screen.queryByText(/Start with the Diagnostic Exam/)).not.toBeInTheDocument()
  })

  it('links every cert-wide test', async () => {
    renderRoute('/clf-c02')
    await screen.findByRole('heading', { name: 'Practice exams' })
    expect(screen.getByRole('link', { name: 'Weak-Area Drill' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=drill',
    )
    expect(screen.getByRole('link', { name: 'Full Practice Exam' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=full',
    )
  })

  it('lists each domain with its exam weight', async () => {
    renderRoute('/clf-c02')
    const card = await screen.findByRole('link', { name: /^Domain 3: Cloud Technology/ })
    expect(card).toHaveAttribute('href', '/clf-c02/d/3')
    expect(card).toHaveTextContent('34% of the exam · 8 tasks')
    expect(card).toHaveTextContent('Not started yet')
  })
})

describe('In progress', () => {
  /** @param {import('../db/types.js').AttemptKind} [kind] */
  const begin = (kind = 'pre') =>
    createAttempt({
      certId: 'clf-c02',
      kind,
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ['clf-c02-1.1-0001', 'clf-c02-1.1-0002', 'clf-c02-1.1-0003'],
      optionOrder: {},
    })

  it('is hidden when nothing is unfinished', async () => {
    renderRoute('/clf-c02')
    await screen.findByRole('heading', { name: 'Practice exams' })
    expect(screen.queryByRole('heading', { name: 'In progress' })).not.toBeInTheDocument()
  })

  it('lists unfinished tests with progress and a way to resume', async () => {
    const attempt = await begin()
    await saveResponse(
      attempt.id,
      'clf-c02-1.1-0001',
      { selected: ['a'], submitted: true, correct: true, markedForReview: false, answeredAt: 5 },
      0,
    )
    await db.attempts.add(makeAttempt({ kind: 'post', status: 'submitted' }))
    renderRoute('/clf-c02')
    const list = await screen.findByRole('list', { name: 'Unfinished tests' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('Pre-Test')
    expect(list).toHaveTextContent('1 of 3 answered')
    expect(within(list).getByRole('link', { name: /^Resume Pre-Test/ })).toHaveAttribute(
      'href',
      `/attempt/${attempt.id}`,
    )
  })

  it('discards an unfinished test after confirmation', async () => {
    const attempt = await begin()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderRoute('/clf-c02')
    await user.click(await screen.findByRole('button', { name: /^Discard Pre-Test/ }))
    await waitFor(async () => expect(await getAttempt(attempt.id)).toBeUndefined())
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'In progress' })).not.toBeInTheDocument(),
    )
  })

  it('keeps it when the learner cancels', async () => {
    const attempt = await begin()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderRoute('/clf-c02')
    await user.click(await screen.findByRole('button', { name: /^Discard Pre-Test/ }))
    expect(await getAttempt(attempt.id)).toBeDefined()
  })
})
