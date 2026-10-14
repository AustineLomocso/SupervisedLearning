import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { markReviewComplete } from '../db/progress.js'
import { graded, makeAttempt, makeResult } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('SubdomainPage', () => {
  it('shows the task statement and recommends the Pre-Test first', async () => {
    renderRoute('/clf-c02/s/1.1')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Task 1.1: Define the benefits of the AWS Cloud.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Domain 1: Cloud Concepts' })).toHaveAttribute(
      'href',
      '/clf-c02/d/1',
    )
    const pre = (await screen.findByRole('link', { name: 'Pre-Test' })).closest('li')
    expect(pre).toHaveTextContent('Recommended next')
  })

  it('reflects earlier attempts and reviews', async () => {
    await db.attempts.add(
      makeAttempt({
        kind: 'pre',
        result: makeResult(60),
        responses: { 'clf-c02-1.1-0001': graded(true, 10) },
      }),
    )
    await markReviewComplete('clf-c02', 'clf-c02/1.1')
    renderRoute('/clf-c02/s/1.1')
    const post = (await screen.findByRole('link', { name: 'Post-Test' })).closest('li')
    expect(post).toHaveTextContent('Recommended next')
    expect(screen.getByRole('link', { name: 'Pre-Test' }).closest('li')).toHaveTextContent(
      'best score 60%',
    )
    expect(screen.getByRole('link', { name: 'Review' }).closest('li')).toHaveTextContent(
      /Reviewed /,
    )
    expect(screen.getByText('Your mastery:').parentElement).toHaveTextContent('100%')
  })
})
