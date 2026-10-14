import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getSubdomain } from '../content/certs.js'
import { renderRoute } from '../test/renderRoute.jsx'

describe('TestSetupPage', () => {
  it('offers the Pre-Test lengths with 10 selected', async () => {
    renderRoute('/clf-c02/test/new?kind=pre&scope=1.1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pre-Test' })).toBeInTheDocument()
    expect(screen.getByText('Task 1.1: Define the benefits of the AWS Cloud.')).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      '5',
      '10',
      '15',
      '20',
    ])
    expect(screen.getByRole('radio', { name: '10' })).toBeChecked()
    expect(screen.getByText(/^Untimed/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Start/ })).toBeDisabled()
  })

  it('turns off lengths longer than the question pool', async () => {
    const pool = getSubdomain('clf-c02', '1.1')?.itemCount ?? 0
    renderRoute('/clf-c02/test/new?kind=post&scope=1.1')
    await screen.findByRole('heading', { level: 1, name: 'Post-Test' })
    for (const value of [10, 15, 20, 25]) {
      expect(screen.getByRole('radio', { name: String(value) })).toHaveProperty(
        'disabled',
        value > pool,
      )
    }
  })

  it('lets the learner choose Exam or Study mode for the Diagnostic Exam', async () => {
    const user = userEvent.setup()
    renderRoute('/clf-c02/test/new?kind=diagnostic')
    await screen.findByRole('heading', { level: 1, name: 'Diagnostic Exam' })
    expect(screen.queryByRole('radio', { name: '10' })).not.toBeInTheDocument()
    expect(screen.getByText(/^65 questions/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Exam mode' })).toBeChecked()
    expect(screen.getByText(/90-minute timer/)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Study mode' }))
    expect(screen.getByText('Study mode has no timer.')).toBeInTheDocument()
  })
})
