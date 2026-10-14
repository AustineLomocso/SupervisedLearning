import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db.js'
import { addFlag } from '../../db/flags.js'
import { markReviewComplete } from '../../db/progress.js'
import { makeAttempt } from '../../test/factories.js'
import { resetDb } from '../../test/resetDb.js'
import ResetSection from './ResetSection.jsx'

beforeEach(async () => {
  await resetDb()
  await db.attempts.add(makeAttempt())
  await markReviewComplete('clf-c02', 'clf-c02/1.1')
  await addFlag({ itemId: 'clf-c02-1.1-0001', itemVersion: 1, certId: 'clf-c02', reason: 'typo' })
})

afterEach(() => vi.restoreAllMocks())

describe('ResetSection', () => {
  it('clears progress but keeps reports after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<ResetSection />)
    await user.click(screen.getByRole('button', { name: 'Reset progress' }))
    expect(await screen.findByText('Progress reset.')).toBeInTheDocument()
    expect(await db.attempts.count()).toBe(0)
    expect(await db.subdomainProgress.count()).toBe(0)
    expect(await db.flags.count()).toBe(1)
  })

  it('does nothing when cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<ResetSection />)
    await user.click(screen.getByRole('button', { name: 'Reset progress' }))
    expect(await db.attempts.count()).toBe(1)
    expect(screen.queryByText('Progress reset.')).not.toBeInTheDocument()
  })
})
