import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { db } from '../db/db.js'
import { graded, makeAttempt } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('HomePage', () => {
  it('shows each cert’s question count and overall mastery', async () => {
    await db.attempts.add(
      makeAttempt({
        responses: { 'clf-c02-1.1-0001': graded(true, 10), 'clf-c02-1.1-0002': graded(false, 20) },
      }),
    )
    renderRoute('/')
    const clf = await screen.findByRole('link', { name: /CLF-C02/ })
    expect(clf).toHaveTextContent(`${getCert('clf-c02')?.itemCount} questions · 19 tasks`)
    await waitFor(() => expect(clf).toHaveTextContent('Mastery 50% · 1 of 19 tasks practiced'))
    const aif = screen.getByRole('link', { name: /AIF-C01/ })
    await waitFor(() => expect(aif).toHaveTextContent('Not started yet'))
  })

  it('states the disclaimers up front', async () => {
    renderRoute('/')
    const about = await screen.findByRole('complementary', { name: 'About this app' })
    expect(within(about).getByText(/Not affiliated with AWS/)).toBeInTheDocument()
    expect(within(about).getByText(/AI-generated content/)).toBeInTheDocument()
  })
})
