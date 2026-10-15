import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAttempt, getAttempt, saveCurrentIndex } from '../db/attempts.js'
import { db } from '../db/db.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

// The three fixture questions: Q1 single (correct "a"), Q2 choose two (correct "a","c"),
// Q3 single (correct "a"). Options are shown in a, b, c, d(, e) order.
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

const ORDER = {
  'clf-c02-1.1-0001': ['a', 'b', 'c', 'd'],
  'clf-c02-1.1-0002': ['a', 'b', 'c', 'd', 'e'],
  'clf-c02-2.1-0003': ['a', 'b', 'c', 'd'],
}

/** @param {{ mode?: 'study' | 'exam', kind?: import('../db/types.js').AttemptKind }} [options] */
function begin({ mode = 'study', kind = 'pre' } = {}) {
  return createAttempt({
    certId: 'clf-c02',
    kind,
    scopeId: 'clf-c02/1.1',
    mode,
    itemIds: Object.keys(ORDER),
    optionOrder: ORDER,
    timeLimitSec: mode === 'exam' ? 90 * 60 : null,
  })
}

beforeEach(resetDb)
afterEach(() => vi.restoreAllMocks())

describe('AttemptPage in Study mode', () => {
  it('shows the first question and keeps Submit disabled until an answer is chosen', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Question 1 of 3' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pre-Test' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Amazon S3' }))
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled()
  })

  it('explains a correct answer and saves it', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon S3' }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(await screen.findByRole('heading', { name: 'Explanation' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    expect(screen.getByText('S3 is AWS object storage.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeDisabled()
    const saved = (await getAttempt(attempt.id))?.responses['clf-c02-1.1-0001']
    expect(saved).toMatchObject({ selected: ['a'], submitted: true, correct: true })
    expect(await db.itemStats.get('clf-c02-1.1-0001')).toMatchObject({ lastCorrect: true })
  })

  it('also explains a wrong answer, with a reason for every option', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon EBS' }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Incorrect')
    for (const text of [
      'S3 is AWS object storage.',
      'EBS is block storage for EC2.',
      'EC2 provides compute capacity.',
      'RDS is a managed database.',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('caps a multiple-response selection and needs the full count to submit', async () => {
    const attempt = await begin()
    await saveCurrentIndex(attempt.id, 1)
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    expect(await screen.findByText('Choose TWO')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Pay-as-you-go pricing' }))
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'Elastic capacity' }))
    expect(screen.getByRole('checkbox', { name: 'Fixed capacity' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled()
  })

  it('moves between questions and remembers the position', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Next question' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Question 2 of 3' }),
    ).toBeInTheDocument()
    await waitFor(async () => expect((await getAttempt(attempt.id))?.currentIndex).toBe(1))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Question 1 of 3' }),
    ).toBeInTheDocument()
  })

  it('resumes at the saved question', async () => {
    const attempt = await begin()
    await saveCurrentIndex(attempt.id, 2)
    renderRoute(`/attempt/${attempt.id}`)
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Question 3 of 3' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Which service runs virtual servers?')).toBeInTheDocument()
  })

  it('supports keyboard shortcuts: letter to choose, Enter to submit, N for next', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await screen.findByRole('heading', { level: 2, name: 'Question 1 of 3' })
    await user.keyboard('a')
    expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeChecked()
    await user.keyboard('2')
    expect(screen.getByRole('radio', { name: 'Amazon EBS' })).toBeChecked()
    await user.keyboard('a')
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('status')).toHaveTextContent('Correct')
    await user.keyboard('n')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Question 2 of 3' }),
    ).toBeInTheDocument()
  })

  it('finishes after confirming, counting unanswered questions as wrong', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const attempt = await begin()
    const user = userEvent.setup()
    const router = renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Finish test' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('3 unanswered questions'))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`),
    )
    expect((await getAttempt(attempt.id))?.status).toBe('submitted')
  })

  it('stays put when the learner cancels the confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Finish test' }))
    expect((await getAttempt(attempt.id))?.status).toBe('in_progress')
  })

  it('sends a finished attempt to its results', async () => {
    const attempt = await begin()
    await db.attempts.update(attempt.id, { status: 'submitted', submittedAt: 5 })
    const router = renderRoute(`/attempt/${attempt.id}`)
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`),
    )
  })

  it('shows the not-found page for an unknown attempt', async () => {
    renderRoute('/attempt/nope')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
  })
})

describe('AttemptPage in Exam mode', () => {
  it('shows a timer and navigator but no feedback and no Submit answer button', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    // The deadline is 90 minutes after the attempt started, so a moment later it reads 1:29:5x.
    expect(await screen.findByRole('timer')).toHaveTextContent(/1:(30:00|29:5\d)/)
    expect(screen.getByRole('navigation', { name: 'Question navigator' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Amazon S3' }))
    expect(screen.queryByRole('heading', { name: 'Explanation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument()
    expect(screen.queryByText('Correct')).not.toBeInTheDocument()
  })

  it('saves a changeable selection', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon EBS' }))
    await user.click(screen.getByRole('radio', { name: 'Amazon S3' }))
    await waitFor(async () =>
      expect((await getAttempt(attempt.id))?.responses['clf-c02-1.1-0001']).toMatchObject({
        selected: ['a'],
        submitted: false,
        correct: null,
      }),
    )
    // The saved change reaches the page through a live query, a moment after the write.
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeChecked())
  })

  it('marks a question for review', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    const mark = await screen.findByRole('button', { name: 'Mark for review' })
    expect(mark).toHaveAttribute('aria-pressed', 'false')
    await user.click(mark)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mark for review' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    expect(
      screen.getByRole('button', { name: 'Question 1: unanswered, marked for review' }),
    ).toBeInTheDocument()
  })

  it('jumps with the navigator', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Question 3: unanswered' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Question 3 of 3' }),
    ).toBeInTheDocument()
  })

  it('submits after confirming, naming the unanswered count', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    const router = renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon S3' }))
    // Wait until the saved answer has flowed back into the page, or the count would be stale.
    expect(await screen.findByText(/Answered 1 of 3/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit exam' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2 unanswered questions'))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`),
    )
    const stored = await getAttempt(attempt.id)
    expect(stored?.result).toMatchObject({ correct: 1, total: 3 })
  })

  it('submits by itself when the time has run out', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    await db.attempts.update(attempt.id, { deadlineAt: Date.now() - 1_000 })
    const confirm = vi.spyOn(window, 'confirm')
    const router = renderRoute(`/attempt/${attempt.id}`)
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`),
    )
    expect(confirm).not.toHaveBeenCalled()
    expect((await getAttempt(attempt.id))?.status).toBe('submitted')
  })

  it('does not choose answers with letter keys while typing in a text field', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await screen.findByRole('timer')
    const field = document.createElement('input')
    field.type = 'text'
    document.body.append(field)
    field.focus()
    await user.keyboard('a')
    expect(
      within(screen.getByRole('main')).getByRole('radio', { name: 'Amazon S3' }),
    ).not.toBeChecked()
    field.remove()
  })
})
