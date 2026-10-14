import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { makeAttempt, makeResult } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('DomainPage', () => {
  it('lists the domain’s tasks with step status and best Post-Test score', async () => {
    await db.attempts.add(makeAttempt({ kind: 'pre', result: makeResult(70) }))
    await db.attempts.add(makeAttempt({ kind: 'post', result: makeResult(85) }))
    renderRoute('/clf-c02/d/1')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Domain 1: Cloud Concepts' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/24% of the exam/)).toBeInTheDocument()
    const tasks = await screen.findByRole('list', { name: 'Tasks' })
    expect(
      within(tasks)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/clf-c02/s/1.1', '/clf-c02/s/1.2', '/clf-c02/s/1.3', '/clf-c02/s/1.4'])
    const row = screen.getByRole('link', { name: /^Task 1\.1:/ }).closest('li')
    expect(row).toHaveTextContent('Pre-Test: done')
    expect(row).toHaveTextContent('Review: not done')
    expect(row).toHaveTextContent('Post-Test: done')
    expect(row).toHaveTextContent('Best Post-Test score: 85%')
  })

  it('links the Domain Assessment', async () => {
    renderRoute('/clf-c02/d/1')
    expect(await screen.findByRole('link', { name: 'Domain Assessment' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=domain&scope=1',
    )
  })
})
