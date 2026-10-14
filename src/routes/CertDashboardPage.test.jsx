import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
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
